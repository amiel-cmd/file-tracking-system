const pool = require('./db');
const { requireAuth } = require('./utils/auth');
const { sanitize, logDocumentHistory, getClientIp } = require('./utils/helpers');
const { validateDocument, validateRouting } = require('./utils/validation');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

// Disable automatic body parsing for file uploads
export const config = {
    api: {
        bodyParser: false,
    },
};

module.exports = async function handler(req, res) {
    const { method, query } = req;

    try {
        switch (method) {
            case 'GET': // View document
                const documentId = query.id || query.document_id;
                if (!documentId) {
                    return res.status(400).json({ success: false, error: 'Document ID is required' });
                }
                const viewQuery = 'SELECT * FROM documents WHERE document_id = $1';
                const viewResult = await pool.query(viewQuery, [documentId]);
                if (viewResult.rows.length === 0) {
                    return res.status(404).json({ success: false, error: 'Document not found' });
                }
                return res.status(200).json({ success: true, document: viewResult.rows[0] });

            case 'POST': // Upload document with file
                // Parse multipart form data
                const form = formidable({
                    maxFileSize: 10 * 1024 * 1024, // 10MB max
                    uploadDir: '/tmp', // Vercel uses /tmp for temporary storage
                    keepExtensions: true,
                    multiples: false
                });

                // Parse the form
                const [fields, files] = await new Promise((resolve, reject) => {
                    form.parse(req, (err, fields, files) => {
                        if (err) {
                            console.error('Form parse error:', err);
                            reject(err);
                        }
                        resolve([fields, files]);
                    });
                });

                console.log('Parsed fields:', fields);
                console.log('Parsed files:', files);

                // Extract form fields (formidable returns arrays for fields)
                const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
                const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
                const document_type = Array.isArray(fields.document_type) ? fields.document_type[0] : fields.document_type;
                const priority = Array.isArray(fields.priority) ? fields.priority[0] : fields.priority;
                
                // Get uploaded file
                const uploadedFile = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;

                // Validate required fields
                if (!title || !document_type || !priority) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Title, document type, and priority are required' 
                    });
                }

                // Validate using existing validation function
                const validationErrors = validateDocument({ title, document_type, priority });
                if (validationErrors.length > 0) {
                    return res.status(400).json({ success: false, error: validationErrors.join(', ') });
                }

                // Validate file
                if (!uploadedFile) {
                    return res.status(400).json({ success: false, error: 'File is required' });
                }

                // Process file
                let filePath = null;
                let fileSize = null;
                let fileName = null;

                if (uploadedFile) {
                    fileName = uploadedFile.originalFilename || uploadedFile.newFilename;
                    fileSize = uploadedFile.size;
                    
                    // For Vercel deployment, you should upload to external storage
                    // For now, we'll store the file path reference
                    // TODO: Implement actual file storage (Supabase Storage, AWS S3, Vercel Blob, etc.)
                    
                    // Generate unique filename
                    const timestamp = Date.now();
                    const ext = path.extname(fileName);
                    const uniqueFileName = `${timestamp}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    
                    // Store file path (relative path for now)
                    filePath = `uploads/documents/${uniqueFileName}`;
                    
                    // TODO: Actual file upload to storage service
                    // Example for Supabase Storage:
                    /*
                    const { createClient } = require('@supabase/supabase-js');
                    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
                    
                    const fileBuffer = fs.readFileSync(uploadedFile.filepath);
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('documents')
                        .upload(uniqueFileName, fileBuffer, {
                            contentType: uploadedFile.mimetype,
                        });
                    
                    if (uploadError) {
                        return res.status(500).json({ success: false, error: 'File upload failed' });
                    }
                    
                    const { data: urlData } = supabase.storage
                        .from('documents')
                        .getPublicUrl(uniqueFileName);
                    
                    filePath = urlData.publicUrl;
                    */
                }

                // Get user ID from JWT token (if authenticated)
                // You can extract this from req.headers.authorization
                const userId = req.user?.userId || 1; // Default to 1 if no auth middleware

                // Sanitize inputs
                const sanitizedTitle = sanitize(title);
                const sanitizedDescription = sanitize(description || '');
                const sanitizedDocType = sanitize(document_type);
                const sanitizedPriority = sanitize(priority);
                const documentNumber = `DOC-${Date.now()}`;

                // Insert into database
                const insertQuery = `
                    INSERT INTO documents 
                    (document_number, title, description, document_type, priority, file_path, file_size, uploaded_by, current_holder, status, uploaded_at) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, 'pending', NOW()) 
                    RETURNING document_id, document_number, title, document_type, priority, status, uploaded_at
                `;
                
                const insertResult = await pool.query(insertQuery, [
                    documentNumber,
                    sanitizedTitle,
                    sanitizedDescription,
                    sanitizedDocType,
                    sanitizedPriority,
                    filePath,
                    fileSize,
                    userId
                ]);

                // Log document history (if function exists)
                if (typeof logDocumentHistory === 'function') {
                    try {
                        await logDocumentHistory({
                            documentId: insertResult.rows[0].document_id,
                            action: 'created',
                            userId: userId,
                            details: `Document uploaded: ${sanitizedTitle}`,
                            ipAddress: getClientIp(req)
                        });
                    } catch (logError) {
                        console.error('Failed to log document history:', logError);
                    }
                }

                return res.status(201).json({
                    success: true,
                    message: 'Document uploaded successfully!',
                    document: insertResult.rows[0],
                    file_path: filePath
                });

            case 'PUT': // Edit document
                const { document_id, newTitle, newDescription, newType, newPriority } = req.body;
                
                if (!document_id) {
                    return res.status(400).json({ success: false, error: 'Document ID is required' });
                }

                // Validate
                const editValidationErrors = validateDocument({ 
                    title: newTitle, 
                    document_type: newType, 
                    priority: newPriority 
                });
                
                if (editValidationErrors.length > 0) {
                    return res.status(400).json({ success: false, error: editValidationErrors.join(', ') });
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

                // Log document history
                if (typeof logDocumentHistory === 'function') {
                    try {
                        await logDocumentHistory({
                            documentId: document_id,
                            action: 'updated',
                            userId: req.user?.userId || 1,
                            details: `Document updated: ${newTitle}`,
                            ipAddress: getClientIp(req)
                        });
                    } catch (logError) {
                        console.error('Failed to log document history:', logError);
                    }
                }

                return res.status(200).json({
                    success: true,
                    message: 'Document updated successfully!',
                    document: updateResult.rows[0],
                });

            case 'DELETE': // Delete document
                const deleteDocumentId = query.id || req.body?.document_id;
                
                if (!deleteDocumentId) {
                    return res.status(400).json({ success: false, error: 'Document ID is required' });
                }

                // First, get document info for logging
                const docQuery = 'SELECT title, file_path FROM documents WHERE document_id = $1';
                const docResult = await pool.query(docQuery, [deleteDocumentId]);
                
                if (docResult.rows.length === 0) {
                    return res.status(404).json({ success: false, error: 'Document not found' });
                }

                const documentInfo = docResult.rows[0];

                // Delete from database
                const deleteQuery = 'DELETE FROM documents WHERE document_id = $1 RETURNING document_id';
                const deleteResult = await pool.query(deleteQuery, [deleteDocumentId]);

                // TODO: Delete actual file from storage
                // Example for Supabase:
                /*
                if (documentInfo.file_path) {
                    const fileName = path.basename(documentInfo.file_path);
                    await supabase.storage.from('documents').remove([fileName]);
                }
                */

                // Log document history
                if (typeof logDocumentHistory === 'function') {
                    try {
                        await logDocumentHistory({
                            documentId: deleteDocumentId,
                            action: 'deleted',
                            userId: req.user?.userId || 1,
                            details: `Document deleted: ${documentInfo.title}`,
                            ipAddress: getClientIp(req)
                        });
                    } catch (logError) {
                        console.error('Failed to log document history:', logError);
                    }
                }

                return res.status(200).json({ 
                    success: true, 
                    message: 'Document deleted successfully!' 
                });

            default:
                return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error handling documents:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Internal server error', 
            message: error.message 
        });
    }
};
