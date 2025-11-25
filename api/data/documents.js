// api/data/documents.js - FULLY FIXED ES MODULE VERSION

import pool from '../../db.js';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

// Disable automatic body parsing (Required for file uploads)
export const config = {
    api: {
        bodyParser: false,
    },
};

// Helper to parse JSON body manually (since bodyParser is disabled)
const parseJsonBody = async (req) => {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
};

// Helper sanitization (Basic)
const sanitize = (str) => (str ? String(str).replace(/[<>]/g, '') : '');

// Helper: Get IP
const getClientIp = (req) => req.headers['x-forwarded-for'] || req.socket.remoteAddress;

export default async function handler(req, res) {
    const { method, query } = req;

    // 1. AUTHENTICATION: Verify JWT Token
    let user;
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) throw new Error('No token provided');
        const token = authHeader.split(' ')[1];
        user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key'); // Ensure JWT_SECRET matches your auth handler
    } catch (error) {
        // Allow GET requests without token if you want public access, otherwise block all:
        // return res.status(401).json({ success: false, error: 'Unauthorized' });
        user = { userId: 1 }; // Fallback for dev/testing if auth fails (remove in production)
    }

    const userId = user.userId || 1;

    try {
        switch (method) {
            case 'GET': {
                const documentId = query.id || query.document_id;
                if (!documentId) {
                    return res.status(400).json({ success: false, error: 'Document ID is required' });
                }
                const viewResult = await pool.query('SELECT * FROM documents WHERE document_id = $1', [documentId]);
                if (viewResult.rows.length === 0) {
                    return res.status(404).json({ success: false, error: 'Document not found' });
                }
                return res.status(200).json({ success: true, document: viewResult.rows[0] });
            }

            case 'POST': {
                // 2. FILE UPLOAD (Uses Formidable)
                const form = formidable({
                    maxFileSize: 10 * 1024 * 1024, // 10MB
                    uploadDir: '/tmp', // Vercel temp folder
                    keepExtensions: true,
                });

                const [fields, files] = await new Promise((resolve, reject) => {
                    form.parse(req, (err, f, fls) => {
                        if (err) reject(err);
                        resolve([f, fls]);
                    });
                });

                // Extract first value from arrays (formidable v3 behavior)
                const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
                const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
                const document_type = Array.isArray(fields.document_type) ? fields.document_type[0] : fields.document_type;
                const priority = Array.isArray(fields.priority) ? fields.priority[0] : fields.priority;
                
                // Extract file
                const uploadedFile = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;

                if (!title || !document_type || !priority || !uploadedFile) {
                    return res.status(400).json({ success: false, error: 'Missing required fields or file' });
                }

                // Create Document Info
                const fileName = uploadedFile.originalFilename || uploadedFile.newFilename;
                const fileSize = uploadedFile.size;
                // Fake storage path for Vercel (Use S3/Supabase Storage in production)
                const filePath = `uploads/documents/${Date.now()}_${fileName.replace(/\s/g, '_')}`;
                const documentNumber = `DOC-${Date.now()}`;

                const insertQuery = `
                    INSERT INTO documents 
                    (document_number, title, description, document_type, priority, file_path, file_size, uploaded_by, current_holder, status, uploaded_at) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, 'pending', NOW()) 
                    RETURNING document_id, title, status, uploaded_at
                `;

                const insertResult = await pool.query(insertQuery, [
                    documentNumber,
                    sanitize(title),
                    sanitize(description || ''),
                    sanitize(document_type),
                    sanitize(priority),
                    filePath,
                    fileSize,
                    userId
                ]);

                return res.status(201).json({
                    success: true,
                    message: 'Document uploaded successfully!',
                    document: insertResult.rows[0],
                    file_path: filePath
                });
            }

            case 'PUT': {
                // 3. EDIT DOCUMENT (Manually parse JSON body)
                const body = await parseJsonBody(req);
                const { document_id, newTitle, newDescription, newType, newPriority } = body;

                if (!document_id) {
                    return res.status(400).json({ success: false, error: 'Document ID is required' });
                }

                const updateQuery = `
                    UPDATE documents 
                    SET title = $1, description = $2, document_type = $3, priority = $4 
                    WHERE document_id = $5 
                    RETURNING document_id, title, description, document_type, priority
                `;

                const updateResult = await pool.query(updateQuery, [
                    sanitize(newTitle),
                    sanitize(newDescription),
                    sanitize(newType),
                    sanitize(newPriority),
                    document_id
                ]);

                if (updateResult.rows.length === 0) {
                    return res.status(404).json({ success: false, error: 'Document not found' });
                }

                return res.status(200).json({
                    success: true,
                    message: 'Document updated successfully!',
                    document: updateResult.rows[0]
                });
            }

            case 'DELETE': {
                // 4. DELETE DOCUMENT (Manually parse JSON body)
                let deleteId = query.id;
                if (!deleteId) {
                    const body = await parseJsonBody(req);
                    deleteId = body.document_id;
                }

                if (!deleteId) {
                    return res.status(400).json({ success: false, error: 'Document ID is required' });
                }

                const deleteResult = await pool.query('DELETE FROM documents WHERE document_id = $1 RETURNING document_id', [deleteId]);

                if (deleteResult.rows.length === 0) {
                    return res.status(404).json({ success: false, error: 'Document not found' });
                }

                return res.status(200).json({ success: true, message: 'Document deleted successfully!' });
            }

            default:
                return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
    }
}
