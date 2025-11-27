// api/data/documents.js - SECURED VERSION with Optional File Upload

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

// STEP 5: Rate Limiting
const rateLimitMap = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];
  
  // Keep only requests from last minute
  const recentRequests = userRequests.filter(time => now - time < 60000);
  
  if (recentRequests.length >= 20) { // Max 20 requests per minute
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);
  return true;
}

// Cleanup old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, requests] of rateLimitMap.entries()) {
    const recent = requests.filter(time => now - time < 60000);
    if (recent.length === 0) {
      rateLimitMap.delete(userId);
    } else {
      rateLimitMap.set(userId, recent);
    }
  }
}, 300000);

// STEP 6: File Type Validation
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/zip',
  'application/x-rar-compressed'
];

const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'txt', 'csv', 'zip', 'rar'
];

function validateFile(file) {
  // Check file extension
  const fileName = file.originalFilename || file.newFilename;
  const ext = fileName.toLowerCase().split('.').pop();
  
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File extension '.${ext}' is not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
    };
  }
  
  // Check MIME type
  const mimeType = file.mimetype;
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `File type '${mimeType}' is not allowed for security reasons`
    };
  }
  
  return { valid: true };
}

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
    user = { userId: 1, role: 'user' };
  }
  const userId = user.userId || 1;
  const userRole = user.role || 'user';

  // STEP 5: Check Rate Limit
  if (!checkRateLimit(userId)) {
    console.log(`Rate limit exceeded for user ${userId} from IP ${getClientIp(req)}`);
    return res.status(429).json({ 
      success: false, 
      error: 'Too many requests. Please try again later.' 
    });
  }

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
          
          // Check if document has a file
          if (!doc.mega_file_id) {
            return res.status(404).json({ 
              success: false, 
              error: 'This document has no attached file' 
            });
          }
          
          // STEP 3: Access Control Check
          if (doc.uploaded_by !== userId && doc.current_holder !== userId && userRole !== 'admin') {
            console.log(`Access denied: User ${userId} attempted to view document ${documentId}`);
            return res.status(403).json({ 
              success: false, 
              error: 'Access denied: You do not have permission to view this document' 
            });
          }
          
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
          
          // Check if document has a file
          if (!doc.mega_file_id) {
            return res.status(404).json({ 
              success: false, 
              error: 'This document has no attached file' 
            });
          }
          
          // STEP 3: Access Control Check
          if (doc.uploaded_by !== userId && doc.current_holder !== userId && userRole !== 'admin') {
            console.log(`Access denied: User ${userId} attempted to download document ${documentId}`);
            return res.status(403).json({ 
              success: false, 
              error: 'Access denied: You do not have permission to download this document' 
            });
          }
          
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
        
        const doc = viewResult.rows[0];
        
        // STEP 3: Access Control Check for metadata
        if (doc.uploaded_by !== userId && doc.current_holder !== userId && userRole !== 'admin') {
          return res.status(403).json({ 
            success: false, 
            error: 'Access denied: You do not have permission to access this document' 
          });
        }
        
        return res.status(200).json({ success: true, document: viewResult.rows[0] });
      }

      case 'POST': {
        // Check for special actions in query
        if (query.action === 'archive') {
          const body = await parseJsonBody(req);
          const { document_id } = body;

          if (!document_id) {
            return res.status(400).json({ success: false, error: 'Document ID is required' });
          }

          // STEP 3: Verify ownership before archiving
          const docCheck = await pool.query('SELECT uploaded_by FROM documents WHERE document_id = $1', [document_id]);
          if (docCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
          }
          
          if (docCheck.rows[0].uploaded_by !== userId && userRole !== 'admin') {
            return res.status(403).json({ 
              success: false, 
              error: 'Access denied: You can only archive documents you uploaded' 
            });
          }

          const archiveQuery = `
            UPDATE documents 
            SET is_archived = 1, archived_at = NOW(), archived_by = $1 
            WHERE document_id = $2 
            RETURNING document_id, title, is_archived
          `;

          const archiveResult = await pool.query(archiveQuery, [userId, document_id]);

          return res.status(200).json({
            success: true,
            message: 'Document archived successfully!',
            document: archiveResult.rows[0],
          });
        }

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

        // File - NOW OPTIONAL
        const uploadedFile = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;

        // CHANGED: File is now optional, only require title, type, and priority
        if (!title || !document_type || !priority) {
          return res.status(400).json({
            success: false,
            error: 'Title, document type, and priority are required',
          });
        }

        let megaFileId = null;
        let megaLink = null;
        let fileName = null;
        let fileSize = 0;

        // Only upload to MEGA if file is provided
        if (uploadedFile) {
          // STEP 6: Validate File Type
          const validation = validateFile(uploadedFile);
          if (!validation.valid) {
            console.log(`File validation failed for user ${userId}: ${validation.error}`);
            // Clean up uploaded file
            await fs.unlink(uploadedFile.filepath).catch(() => {});
            return res.status(400).json({
              success: false,
              error: validation.error
            });
          }

          fileName = uploadedFile.originalFilename || uploadedFile.newFilename;
          fileSize = uploadedFile.size;

          // Additional size check
          if (fileSize > 10 * 1024 * 1024) {
            await fs.unlink(uploadedFile.filepath).catch(() => {});
            return res.status(400).json({
              success: false,
              error: 'File size exceeds 10MB limit'
            });
          }

          // Upload to MEGA
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
            // Clean up temp file on error
            await fs.unlink(uploadedFile.filepath).catch(() => {});
            return res.status(500).json({
              success: false,
              error: 'Failed to upload to MEGA storage',
              message: error.message
            });
          }
        }

        const documentNumber = `DOC-${Date.now()}`;

        const insertQuery = `
          INSERT INTO documents 
          (document_number, title, description, document_type, priority, file_path, mega_file_id, mega_link, file_size, uploaded_by, current_holder, status, is_archived, uploaded_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, 'pending', 0, NOW()) 
          RETURNING document_id, document_number, title, document_type, priority, status, uploaded_at
        `;

        const insertResult = await pool.query(insertQuery, [
          documentNumber,
          sanitize(title),
          sanitize(description || ''),
          sanitize(document_type),
          sanitize(priority),
          fileName, // Can be null
          megaFileId, // Can be null
          megaLink, // Can be null
          fileSize, // 0 if no file
          userId,
        ]);

        console.log(`Document ${uploadedFile ? 'uploaded' : 'created'} successfully by user ${userId}: ${documentNumber}`);

        return res.status(201).json({
          success: true,
          message: uploadedFile 
            ? 'Document uploaded to MEGA successfully!' 
            : 'Document created successfully (no file attached)',
          document: insertResult.rows[0],
          file_name: fileName,
          file_size: fileSize,
          storage: uploadedFile ? 'MEGA' : 'None',
          has_file: !!uploadedFile
        });
      }

      case 'PATCH': {
        // Route document to another user
        const body = await parseJsonBody(req);
        const { document_id, new_holder } = body;

        if (!document_id || !new_holder) {
          return res.status(400).json({ success: false, error: 'Document ID and new holder are required' });
        }

        // STEP 3: Verify current holder or owner before routing
        const docCheck = await pool.query(
          'SELECT uploaded_by, current_holder FROM documents WHERE document_id = $1',
          [document_id]
        );
        
        if (docCheck.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Document not found' });
        }
        
        const doc = docCheck.rows[0];
        if (doc.uploaded_by !== userId && doc.current_holder !== userId && userRole !== 'admin') {
          return res.status(403).json({ 
            success: false, 
            error: 'Access denied: You can only route documents you own or currently hold' 
          });
        }

        const routeQuery = `
          UPDATE documents 
          SET current_holder = $1, status = 'routed' 
          WHERE document_id = $2 
          RETURNING document_id, current_holder, status
        `;

        const routeResult = await pool.query(routeQuery, [new_holder, document_id]);

        return res.status(200).json({
          success: true,
          message: 'Document routed successfully!',
          document: routeResult.rows[0],
        });
      }

      case 'PUT': {
        const body = await parseJsonBody(req);
        const { document_id, title, description, document_type, priority } = body;

        if (!document_id) {
          return res.status(400).json({ success: false, error: 'Document ID is required' });
        }

        // STEP 3: Verify ownership before updating
        const docCheck = await pool.query('SELECT uploaded_by FROM documents WHERE document_id = $1', [document_id]);
        if (docCheck.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Document not found' });
        }
        
        if (docCheck.rows[0].uploaded_by !== userId && userRole !== 'admin') {
          return res.status(403).json({ 
            success: false, 
            error: 'Access denied: You can only edit documents you uploaded' 
          });
        }

        const updateQuery = `
          UPDATE documents 
          SET title = $1, description = $2, document_type = $3, priority = $4 
          WHERE document_id = $5 
          RETURNING document_id, title, description, document_type, priority
        `;

        const updateResult = await pool.query(updateQuery, [
          sanitize(title),
          sanitize(description || ''),
          sanitize(document_type),
          sanitize(priority),
          document_id,
        ]);

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

        // Get document info first
        const docResult = await pool.query(
          'SELECT mega_file_id, uploaded_by, title FROM documents WHERE document_id = $1',
          [deleteId]
        );
        
        if (docResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Document not found' });
        }

        // STEP 3: Verify ownership before deleting
        const doc = docResult.rows[0];
        if (doc.uploaded_by !== userId && userRole !== 'admin') {
          return res.status(403).json({ 
            success: false, 
            error: 'Access denied: You can only delete documents you uploaded' 
          });
        }

        // CHANGED: Only delete from MEGA if file exists
        if (doc.mega_file_id) {
          let megaDeleted = false;

          try {
            const storage = await getMegaStorage();
            const file = await findMegaFile(storage, doc.mega_file_id);
            
            if (file) {
              await file.delete();
              megaDeleted = true;
              console.log(`✓ File deleted from MEGA: ${doc.mega_file_id}`);
            } else {
              // File doesn't exist in MEGA, treat as already deleted
              console.log(`⚠ File not found in MEGA (may have been deleted already): ${doc.mega_file_id}`);
              megaDeleted = true; // Allow database deletion
            }
          } catch (error) {
            console.error('✗ MEGA deletion failed:', error);
            
            // If MEGA deletion fails, don't delete from database
            return res.status(500).json({
              success: false,
              error: 'Failed to delete file from MEGA storage',
              details: error.message,
              message: 'Document was not deleted to maintain data consistency. Please try again or contact support.'
            });
          }

          // Only proceed if MEGA deletion succeeded
          if (!megaDeleted) {
            return res.status(500).json({
              success: false,
              error: 'MEGA deletion did not complete successfully'
            });
          }
        } else {
          console.log(`ℹ Document ${deleteId} has no attached file, skipping MEGA deletion`);
        }

        // Delete from database (either file was deleted from MEGA or there was no file)
        try {
          const deleteResult = await pool.query(
            'DELETE FROM documents WHERE document_id = $1 RETURNING document_id, title',
            [deleteId]
          );

          if (deleteResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found in database' });
          }

          console.log(`✓ Document deleted from database by user ${userId}: ${deleteId} (${doc.title})`);

          return res.status(200).json({
            success: true,
            message: doc.mega_file_id 
              ? 'Document and file deleted successfully!' 
              : 'Document deleted successfully (no file was attached)',
            deleted: deleteResult.rows[0],
            had_file: !!doc.mega_file_id
          });
        } catch (dbError) {
          console.error('✗ Database deletion failed:', dbError);
          
          return res.status(500).json({
            success: false,
            error: 'Database deletion failed',
            details: dbError.message,
            message: 'Please try again or contact support.'
          });
        }
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
