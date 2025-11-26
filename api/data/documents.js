// api/data/documents.js - FIXED: Correct MEGA file retrieval

// Core imports
const pool = require('../db');
const jwt = require('jsonwebtoken');
const { Storage } = require('megajs');
const fs = require('fs').promises;

// Formidable v3 is ESM-only; require() returns an object with .default
const formidableModule = require('formidable');
const formidable = formidableModule.default || formidableModule;

// Disable automatic body parsing for file uploads
exports.config = {
  api: {
    bodyParser: false,
  },
};

// Helper: Initialize MEGA storage
const getMegaStorage = async () => {
  try {
    const storage = await new Storage({
      email: process.env.MEGA_EMAIL,
      password: process.env.MEGA_PASSWORD
    }).ready;
    return storage;
  } catch (error) {
    console.error('MEGA login failed:', error);
    throw new Error('Failed to connect to MEGA storage');
  }
};

// Helper: Find file in MEGA by nodeId
const findMegaFile = async (storage, nodeId) => {
  // Search through all files in storage
  const files = storage.root.children || [];
  
  for (const file of files) {
    if (file.nodeId === nodeId) {
      return file;
    }
  }
  
  // If not found in root, search recursively
  const searchInFolder = (folder) => {
    if (!folder.children) return null;
    
    for (const item of folder.children) {
      if (item.nodeId === nodeId) {
        return item;
      }
      if (item.directory && item.children) {
        const found = searchInFolder(item);
        if (found) return found;
      }
    }
    return null;
  };
  
  return searchInFolder(storage.root);
};

// Helper to parse JSON body manually (because bodyParser is disabled)
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

// Helper to detect MIME type from filename
const getMimeType = (filename) => {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    'zip': 'application/zip',
    'rar': 'application/x-rar-compressed',
    'csv': 'text/csv',
  };
  return mimeTypes[ext] || 'application/octet-stream';
};

// Simple sanitization
const sanitize = (str) => (str ? String(str).replace(/[<>]/g, '') : '');

// IP helper (for logging if you need it)
const getClientIp = (req) => req.headers['x-forwarded-for'] || req.socket.remoteAddress;

module.exports = async function handler(req, res) {
  const { method, query } = req;

  // Auth: decode JWT from Authorization header
  let user;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) throw new Error('No token provided');
    const token = authHeader.split(' ')[1];
    user = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');
  } catch (error) {
    // For local dev you can fall back to userId=1; remove this in production
    user = { userId: 1 };
  }
  const userId = user.userId || 1;

  try {
    switch (method) {
      case 'GET': {
        const documentId = query.id || query.document_id;
        
        // If view=true, fetch from MEGA and display inline (for preview)
        if (query.view === 'true') {
          if (!documentId) {
            return res.status(400).json({ success: false, error: 'Document ID is required' });
          }
          
          const docResult = await pool.query('SELECT * FROM documents WHERE document_id = $1', [documentId]);
          if (docResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
          }
          
          const doc = docResult.rows[0];
          
          // View/Preview from MEGA
          try {
            const storage = await getMegaStorage();
            const file = await findMegaFile(storage, doc.mega_file_id);
            
            if (!file) {
              console.error('File not found in MEGA:', doc.mega_file_id);
              return res.status(404).json({ success: false, error: 'File not found in MEGA storage' });
            }
            
            const buffer = await file.downloadBuffer();
            
            const mimeType = getMimeType(doc.file_path);
            const ext = doc.file_path.toLowerCase().split('.').pop();
            
            // Set proper headers for inline viewing
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${doc.file_path}"`);
            res.setHeader('Content-Length', buffer.length);
            
            // For Office documents, add CORS headers to allow Google Docs Viewer
            if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET');
            }
            
            return res.send(buffer);
          } catch (error) {
            console.error('MEGA view failed:', error);
            return res.status(500).json({ success: false, error: 'Failed to view file from MEGA', details: error.message });
          }
        }
        
        // If download=true, fetch from MEGA and return file for download
        if (query.download === 'true') {
          if (!documentId) {
            return res.status(400).json({ success: false, error: 'Document ID is required' });
          }
          
          const docResult = await pool.query('SELECT * FROM documents WHERE document_id = $1', [documentId]);
          if (docResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
          }
          
          const doc = docResult.rows[0];
          
          // Download from MEGA
          try {
            const storage = await getMegaStorage();
            const file = await findMegaFile(storage, doc.mega_file_id);
            
            if (!file) {
              console.error('File not found in MEGA:', doc.mega_file_id);
              return res.status(404).json({ success: false, error: 'File not found in MEGA storage' });
            }
            
            const buffer = await file.downloadBuffer();
            
            const mimeType = getMimeType(doc.file_path);
            
            // CRITICAL: Set proper headers for file download
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${doc.file_path}"`);
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Cache-Control', 'no-cache');
            
            // Send raw buffer - DO NOT use res.json() or it converts to JSON!
            return res.send(buffer);
          } catch (error) {
            console.error('MEGA download failed:', error);
            return res.status(500).json({ success: false, error: 'Failed to download from MEGA', details: error.message });
          }
        }
        
        // Otherwise return document metadata
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
        // File upload using formidable + MEGA
        const form = formidable({
          maxFileSize: 10 * 1024 * 1024, // 10MB
          uploadDir: '/tmp',             // Vercel temp dir
          keepExtensions: true,
          multiples: false,
        });

        const [fields, files] = await new Promise((resolve, reject) => {
          form.parse(req, (err, f, fls) => {
            if (err) return reject(err);
            resolve([f, fls]);
          });
        });

        // Extract fields (formidable v3 returns arrays)
        const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
        const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
        const document_type = Array.isArray(fields.document_type) ? fields.document_type[0] : fields.document_type;
        const priority = Array.isArray(fields.priority) ? fields.priority[0] : fields.priority;

        // File
        const uploadedFile = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;

        if (!title || !document_type || !priority || !uploadedFile) {
          return res.status(400).json({
            success: false,
            error: 'Title, document type, priority, and file are required',
          });
        }

        const fileName = uploadedFile.originalFilename || uploadedFile.newFilename;
        const fileSize = uploadedFile.size;

        // Upload to MEGA
        let megaFileId, megaLink;
        try {
          const storage = await getMegaStorage();
          
          // Read file from temp location
          const fileBuffer = await fs.readFile(uploadedFile.filepath);
          
          // Upload to MEGA
          const uploadedMegaFile = await storage.upload({
            name: fileName,
            size: fileBuffer.length
          }, fileBuffer).complete;
          
          megaFileId = uploadedMegaFile.nodeId; // MEGA's unique file ID
          megaLink = uploadedMegaFile.link(); // Public download link (optional)
          
          // Clean up temp file
          await fs.unlink(uploadedFile.filepath).catch(() => {});
          
        } catch (error) {
          console.error('MEGA upload failed:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to upload to MEGA storage',
            message: error.message
          });
        }

        const documentNumber = `DOC-${Date.now()}`;

        const insertQuery = `
          INSERT INTO documents 
          (document_number, title, description, document_type, priority, file_path, mega_file_id, mega_link, file_size, uploaded_by, current_holder, status, uploaded_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, 'pending', NOW()) 
          RETURNING document_id, document_number, title, document_type, priority, status, uploaded_at
        `;

        const insertResult = await pool.query(insertQuery, [
          documentNumber,
          sanitize(title),
          sanitize(description || ''),
          sanitize(document_type),
          sanitize(priority),
          fileName, // Store original filename in file_path
          megaFileId, // MEGA node ID
          megaLink || null, // MEGA public link (optional)
          fileSize,
          userId,
        ]);

        return res.status(201).json({
          success: true,
          message: 'Document uploaded to MEGA successfully!',
          document: insertResult.rows[0],
          file_name: fileName,
          file_size: fileSize,
          storage: 'MEGA'
        });
      }

      case 'PATCH': {
        // Route document to another user
        const body = await parseJsonBody(req);
        const { document_id, new_holder } = body;

        if (!document_id || !new_holder) {
          return res.status(400).json({ success: false, error: 'Document ID and new holder are required' });
        }

        const routeQuery = `
          UPDATE documents 
          SET current_holder = $1, status = 'routed' 
          WHERE document_id = $2 
          RETURNING document_id, current_holder, status
        `;

        const routeResult = await pool.query(routeQuery, [new_holder, document_id]);

        if (routeResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Document not found' });
        }

        return res.status(200).json({
          success: true,
          message: 'Document routed successfully!',
          document: routeResult.rows[0],
        });
      }

      case 'PUT': {
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
          sanitize(newDescription || ''),
          sanitize(newType),
          sanitize(newPriority),
          document_id,
        ]);

        if (updateResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Document not found' });
        }

        return res.status(200).json({
          success: true,
          message: 'Document updated successfully!',
          document: updateResult.rows[0],
        });
      }

      case 'DELETE': {
        let deleteId = query.id;
        if (!deleteId) {
          const body = await parseJsonBody(req);
          deleteId = body.document_id;
        }

        if (!deleteId) {
          return res.status(400).json({ success: false, error: 'Document ID is required' });
        }

        // Get document info first to delete from MEGA
        const docResult = await pool.query('SELECT mega_file_id FROM documents WHERE document_id = $1', [deleteId]);
        
        if (docResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Document not found' });
        }

        // Delete from MEGA
        try {
          const storage = await getMegaStorage();
          const file = await findMegaFile(storage, docResult.rows[0].mega_file_id);
          
          if (file) {
            await file.delete();
          }
        } catch (error) {
          console.error('MEGA deletion failed:', error);
          // Continue with DB deletion even if MEGA fails
        }

        // Delete from database
        const deleteResult = await pool.query(
          'DELETE FROM documents WHERE document_id = $1 RETURNING document_id',
          [deleteId],
        );

        return res.status(200).json({
          success: true,
          message: 'Document deleted from MEGA and database successfully!',
        });
      }

      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Error handling documents:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
