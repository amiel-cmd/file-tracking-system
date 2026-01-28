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
  if (!filename) return 'application/octet-stream';
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

// Helper to log document history
async function logHistory(documentId, userId, action, details) {
  try {
    await pool.query(
      `INSERT INTO document_history (document_id, user_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [documentId, userId, action, details]
    );
    console.log(`✓ History logged: ${action} for document ${documentId} by user ${userId}`);
  } catch (error) {
    console.error('Failed to log document history:', error);
    // Don't throw error - history logging failure shouldn't break main operation
  }
}

module.exports = async function handler(req, res) {
  const { method, query } = req;
  const urlPath = req.url.split('?')[0]; // Get clean URL path

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
        
        // --- NEW: Admin endpoint to get ALL documents ---
        if (query.all === 'true') {
          if (userRole !== 'admin') {
            return res.status(403).json({ success: false, error: 'Unauthorized: Admin access required' });
          }

          try {
            // FIXED QUERY: Changed d.user_id to d.uploaded_by
            // Note: d.* will automatically include 'signatory' if it exists in DB
            const allDocsQuery = `
              SELECT d.*, 
                     u.full_name as uploaded_by_name, 
                     u.username as uploaded_by_username 
              FROM documents d 
              LEFT JOIN users u ON d.uploaded_by = u.user_id 
              ORDER BY d.uploaded_at DESC
            `;
            const result = await pool.query(allDocsQuery);
            
            return res.status(200).json({
              success: true,
              documents: result.rows
            });
          } catch (error) {
            console.error('Error fetching all documents:', error);
            // Log the actual SQL error to console for debugging
            return res.status(500).json({ 
              success: false, 
              error: 'Failed to fetch all documents',
              details: error.message 
            });
          }
        }
        // ------------------------------------------------

        // Handle /documents/history endpoint
        if (urlPath.includes('/history')) {
          if (!documentId) {
            return res.status(400).json({ success: false, error: 'Document ID is required' });
          }
          
          try {
            // Get document history
            const historyQuery = `SELECT dh.*, 
                          u.full_name as user_name,
                          u.department as user_department
                          FROM document_history dh
                          LEFT JOIN users u ON dh.user_id = u.user_id
                          WHERE dh.document_id = $1
                          ORDER BY dh.created_at DESC`;
            
            const historyResult = await pool.query(historyQuery, [documentId]);
            
            // Get routing history
            const routingQuery = `SELECT dr.*, 
                                u_from.full_name as from_user_name,
                                u_to.full_name as to_user_name
                                FROM document_routing dr
                                LEFT JOIN users u_from ON dr.from_user_id = u_from.user_id
                                LEFT JOIN users u_to ON dr.to_user_id = u_to.user_id
                                WHERE dr.document_id = $1
                                ORDER BY dr.routed_at DESC`;
            
            const routingResult = await pool.query(routingQuery, [documentId]);
            
            return res.status(200).json({
                success: true,
                history: historyResult.rows,
                routing: routingResult.rows
            });
          } catch (error) {
            console.error('Document history error:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch document history',
                message: error.message 
            });
          }
        }
        
        // Handle history query parameter (backwards compatibility)
        if (query.history === 'true') {
          if (!documentId) {
            return res.status(400).json({ success: false, error: 'Document ID is required' });
          }
          
          try {
            const historyQuery = `SELECT dh.*, 
                          u.full_name as user_name,
                          u.department as user_department
                          FROM document_history dh
                          LEFT JOIN users u ON dh.user_id = u.user_id
                          WHERE dh.document_id = $1
                          ORDER BY dh.created_at DESC`;
            
            const historyResult = await pool.query(historyQuery, [documentId]);
            
            const routingQuery = `SELECT dr.*, 
                                u_from.full_name as from_user_name,
                                u_to.full_name as to_user_name
                                FROM document_routing dr
                                LEFT JOIN users u_from ON dr.from_user_id = u_from.user_id
                                LEFT JOIN users u_to ON dr.to_user_id = u_to.user_id
                                WHERE dr.document_id = $1
                                ORDER BY dr.routed_at DESC`;
            
            const routingResult = await pool.query(routingQuery, [documentId]);
            
            return res.status(200).json({
                success: true,
                history: historyResult.rows,
                routing: routingResult.rows
            });
          } catch (error) {
            console.error('Document history error:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to fetch document history',
                message: error.message 
            });
          }
        }
        
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
          
          // NO ACCESS CONTROL - Everyone can view documents
          
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
            const ext = doc.file_path ? doc.file_path.toLowerCase().split('.').pop() : '';
            
            // Set proper headers for inline viewing
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `inline; filename="${doc.file_path || 'document'}"`);
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
          
          // NO ACCESS CONTROL - Everyone can download documents
          
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
            
            // Set proper headers for file download
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Disposition', `attachment; filename="${doc.file_path || 'document'}"`);
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Cache-Control', 'no-cache');
            
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
        
        // NO ACCESS CONTROL - Everyone can view document metadata
        
        return res.status(200).json({ success: true, document: viewResult.rows[0] });
      }

            case 'POST': {

              // --- NEW ACTION: Replace attached file for an existing document ---
// Usage: POST /api/documents?action=replaceFile  (multipart/form-data with field: documentid, file)
// Rules: only uploader or admin can replace; replaces MEGA file, updates DB, logs history.

if (query.action === "replaceFile") {
  // Parse multipart (needs formidable)
  let fields, files;
  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      uploadDir: "/tmp",
      keepExtensions: true,
      multiples: false,
      allowEmptyFiles: false, // replacing requires a real file
      minFileSize: 1,         // must not be 0-byte
    });

    [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, f, fls) => {
        if (err) return reject(err);
        resolve([f, fls]);
      });
    });
  } catch (parseError) {
    return res.status(400).json({
      success: false,
      error: "Failed to parse form data",
      message: parseError.message,
    });
  }

  const rawDocumentId = Array.isArray(fields.documentid)
    ? fields.documentid[0]
    : fields.documentid;

  const documentid = rawDocumentId ? Number(rawDocumentId) : null;
  if (!documentid) {
    // cleanup temp file if present
    const tmp = files?.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;
    if (tmp?.filepath) await fs.unlink(tmp.filepath).catch(() => {});
    return res.status(400).json({ success: false, error: "Document ID is required" });
  }

  // Extract file
  let uploadedFile = files.file
    ? (Array.isArray(files.file) ? files.file[0] : files.file)
    : null;

  if (!uploadedFile || !uploadedFile.filepath || uploadedFile.size <= 0) {
    if (uploadedFile?.filepath) await fs.unlink(uploadedFile.filepath).catch(() => {});
    return res.status(400).json({ success: false, error: "A valid file is required for replacement" });
  }

  // Validate type (reuse your existing validateFile)
  const validation = validateFile(uploadedFile);
  if (!validation.valid) {
    await fs.unlink(uploadedFile.filepath).catch(() => {});
    return res.status(400).json({ success: false, error: validation.error });
  }

  // Verify doc exists + permission
  const docRes = await pool.query(
    "SELECT documentid, title, uploadedby, megafileid FROM documents WHERE documentid = $1",
    [documentid]
  );

  if (docRes.rows.length === 0) {
    await fs.unlink(uploadedFile.filepath).catch(() => {});
    return res.status(404).json({ success: false, error: "Document not found" });
  }

  const doc = docRes.rows[0];

  if (doc.uploadedby !== userId && userRole !== "admin") {
    await fs.unlink(uploadedFile.filepath).catch(() => {});
    return res.status(403).json({
      success: false,
      error: "Access denied. You can only replace files for documents you uploaded.",
    });
  }

  // Upload new file to MEGA first (safer: only delete old after new upload succeeds)
  const fileName = uploadedFile.originalFilename || uploadedFile.newFilename || "document";
  const fileSize = uploadedFile.size;

  let newMegaFileId = null;
  let newMegaLink = null;

  try {
    const storage = await getMegaStorage();
    const fileBuffer = await fs.readFile(uploadedFile.filepath);

    const uploadedMegaFile = await storage.upload(
      { name: fileName, size: fileBuffer.length },
      fileBuffer
    ).complete;

    newMegaFileId = uploadedMegaFile.nodeId;
    newMegaLink = uploadedMegaFile.link;
  } catch (err) {
    await fs.unlink(uploadedFile.filepath).catch(() => {});
    return res.status(500).json({
      success: false,
      error: "Failed to upload to MEGA storage",
      message: err.message,
    });
  } finally {
    // remove temp file
    await fs.unlink(uploadedFile.filepath).catch(() => {});
  }

  // Delete old MEGA file (best-effort; if it fails, we stop to avoid DB pointing to new file while old still exists? up to you)
  // Here we choose "fail hard" like your DELETE does, to avoid inconsistent state policies.
  if (doc.megafileid) {
    try {
      const storage = await getMegaStorage();
      const oldFile = await findMegaFile(storage, doc.megafileid);
      if (oldFile) {
        await oldFile.delete();
      }
    } catch (err) {
      // If old delete fails, also delete the newly uploaded file to keep storage clean
      try {
        const storage = await getMegaStorage();
        const newFile = await findMegaFile(storage, newMegaFileId);
        if (newFile) await newFile.delete();
      } catch (_) {}

      return res.status(500).json({
        success: false,
        error: "Failed to delete old file from MEGA storage",
        details: err.message,
        message: "Replacement was aborted to maintain consistency. Please try again.",
      });
    }
  }

  // Update DB to point to new file
  const updateRes = await pool.query(
    `UPDATE documents
     SET filepath = $1,
         megafileid = $2,
         megalink = $3,
         filesize = $4
     WHERE documentid = $5
     RETURNING documentid, title, filepath, megafileid, megalink, filesize`,
    [sanitize(fileName), newMegaFileId, newMegaLink, fileSize, documentid]
  );

  await logHistory(
    documentid,
    userId,
    "File Replaced",
    `File replaced for document ${sanitize(doc.title)}; new file: ${sanitize(fileName)} (${(fileSize / 1024).toFixed(2)} KB)`
  );

  return res.status(200).json({
    success: true,
    message: "File replaced successfully!",
    document: updateRes.rows[0],
    filename: fileName,
    filesize: fileSize,
    storage: "MEGA",
    hasfile: true,
  });
}


              if (query.action === 'complete') {
  const body = await parseJsonBody(req);
  const { document_id } = body;

  if (!document_id) {
    return res.status(400).json({ success: false, error: 'Document ID is required' });
  }

  // Only current holder (or admin) can complete
  const docCheck = await pool.query(
    'SELECT current_holder, uploaded_by, title FROM documents WHERE document_id = $1',
    [document_id]
  );

  if (docCheck.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Document not found' });
  }

  if (docCheck.rows[0].current_holder !== userId && userRole !== 'admin') {
    return res.status(403).json({ success: false, error: 'Access denied: only current holder can complete' });
  }

const done = await pool.query(
  "UPDATE documents SET status = 'completed', completed_at = NOW() WHERE document_id = $1 RETURNING *",
  [document_id]
);


  await logHistory(document_id, userId, 'Document Completed', `Document \"${sanitize(docCheck.rows[0].title)}\" marked as completed`);
  return res.status(200).json({ success: true, message: 'Document marked as completed', document: done.rows[0] });
}

        // Check for special actions FIRST (these use JSON, not formidable)
        if (query.action === 'archive') {
          const body = await parseJsonBody(req);
          const { document_id } = body;

          if (!document_id) {
            return res.status(400).json({ success: false, error: 'Document ID is required' });
          }

          const docCheck = await pool.query(
            'SELECT uploaded_by, title FROM documents WHERE document_id = $1',
            [document_id]
          );
          if (docCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
          }

          if (docCheck.rows[0].uploaded_by !== userId && userRole !== 'admin') {
            return res.status(403).json({
              success: false,
              error: 'Access denied: You can only archive documents you uploaded',
            });
          }

          const archiveQuery = `
            UPDATE documents
            SET is_archived = 1,
                archived_at = NOW(),
                archived_by = $1
            WHERE document_id = $2
            RETURNING document_id, title, is_archived
          `;
          const archiveResult = await pool.query(archiveQuery, [userId, document_id]);

          await logHistory(
            document_id,
            userId,
            'Document Archived',
            `Document "${sanitize(docCheck.rows[0].title)}" was archived`,
          );

          return res.status(200).json({
            success: true,
            message: 'Document archived successfully!',
            document: archiveResult.rows[0],
          });
        }

        if (query.action === 'restore') {
          const body = await parseJsonBody(req);
          const { document_id } = body;

          if (!document_id) {
            return res.status(400).json({ success: false, error: 'Document ID is required' });
          }

          const docCheck = await pool.query(
            'SELECT uploaded_by, title, is_archived FROM documents WHERE document_id = $1',
            [document_id]
          );
          if (docCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found' });
          }

          if (docCheck.rows[0].is_archived !== 1) {
            return res.status(400).json({
              success: false,
              error: 'Document is not archived',
            });
          }

          if (docCheck.rows[0].uploaded_by !== userId && userRole !== 'admin') {
            return res.status(403).json({
              success: false,
              error: 'Access denied: You can only restore documents you uploaded',
            });
          }

          const restoreQuery = `
            UPDATE documents
            SET is_archived = 0,
                archived_at = NULL,
                archived_by = NULL
            WHERE document_id = $1
            RETURNING document_id, title, is_archived
          `;
          const restoreResult = await pool.query(restoreQuery, [document_id]);

          await logHistory(
            document_id,
            userId,
            'Document Restored',
            `Document "${sanitize(docCheck.rows[0].title)}" was restored from archive`,
          );

          console.log(`✓ Document ${document_id} restored from archive by user ${userId}`);

          return res.status(200).json({
            success: true,
            message: 'Document restored successfully!',
            document: restoreResult.rows[0],
          });
        }

        // File upload using formidable + MEGA
        let fields, files;
        try {
          const form = formidable({
            maxFileSize: 10 * 1024 * 1024, // 10MB
            uploadDir: '/tmp',
            keepExtensions: true,
            multiples: false,
            allowEmptyFiles: true,  // Allow empty files
            minFileSize: 0,         // Allow 0-byte files
          });

          [fields, files] = await new Promise((resolve, reject) => {
            form.parse(req, (err, f, fls) => {
              if (err) {
                console.error('Formidable parse error:', err);
                return reject(err);
              }
              resolve([f, fls]);
            });
          });
        } catch (parseError) {
          console.error('Form parsing failed:', parseError);
          return res.status(400).json({
            success: false,
            error: 'Failed to parse form data',
            message: parseError.message,
          });
        }

        // Extract fields (formidable v3 returns arrays)
        const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
        const description = Array.isArray(fields.description) ? fields.description[0] : fields.description;
        const document_type = Array.isArray(fields.document_type) ? fields.document_type[0] : fields.document_type;
        const priority = Array.isArray(fields.priority) ? fields.priority[0] : fields.priority;
        const signatory = Array.isArray(fields.signatory) ? fields.signatory[0] : fields.signatory;

        // --- PATCHED: Extract and handle document_number with NULL support ---
        let raw_document_number = Array.isArray(fields.document_number)
          ? fields.document_number[0]
          : fields.document_number;
        let document_number = null;

        // Treat empty/whitespace as null
        if (raw_document_number && String(raw_document_number).trim() !== '') {
          document_number = String(raw_document_number).trim();
        }

        console.log('Parsed fields:', {
          document_number,
          title,
          document_type,
          priority,
          signatory,
          hasDescription: !!description,
        });

        // File - OPTIONAL - Filter out empty files
        let uploadedFile = files.file
          ? (Array.isArray(files.file) ? files.file[0] : files.file)
          : null;

        // Check if file is actually empty (size 0) and treat as no file
        if (uploadedFile && uploadedFile.size === 0) {
          console.log('Empty file detected, treating as no file uploaded');
          // Delete the empty temp file if it exists
          if (uploadedFile.filepath) {
            await fs.unlink(uploadedFile.filepath).catch(() => {});
          }
          uploadedFile = null;
        }

        console.log(
          'Uploaded file:',
          uploadedFile ? `${uploadedFile.originalFilename} (${uploadedFile.size} bytes)` : 'No file',
        );

        if (!title || !document_type || !priority) {
          return res.status(400).json({
            success: false,
            error: 'Title, Document type, and Priority are required',
            received: {
              title: !!title,
              document_type: !!document_type,
              priority: !!priority,
              document_number: !!document_number,
            },
          });
        }

        // --- PATCHED: Check if Document Number already exists (only if provided) ---
        if (document_number) {
          const numCheck = await pool.query(
            'SELECT 1 FROM documents WHERE document_number = $1',
            [document_number],
          );
          if (numCheck.rows.length > 0) {
            // Cleanup uploaded file if it exists
            if (uploadedFile && uploadedFile.filepath) {
              await fs.unlink(uploadedFile.filepath).catch(() => {});
            }
            return res.status(400).json({
              success: false,
              error: 'Document Number already exists',
            });
          }
        }

        let megaFileId = null;
        let megaLink = null;
        let fileName = null;
        let fileSize = 0;

        // Only upload to MEGA if file is provided
        if (uploadedFile) {
          // Validate File Type
          const validation = validateFile(uploadedFile);
          if (!validation.valid) {
            console.log(`File validation failed for user ${userId}: ${validation.error}`);
            await fs.unlink(uploadedFile.filepath).catch(() => {});
            return res.status(400).json({
              success: false,
              error: validation.error,
            });
          }

          fileName = uploadedFile.originalFilename || uploadedFile.newFilename;
          fileSize = uploadedFile.size;

          // Additional size check
          if (fileSize > 10 * 1024 * 1024) {
            await fs.unlink(uploadedFile.filepath).catch(() => {});
            return res.status(400).json({
              success: false,
              error: 'File size exceeds 10MB limit',
            });
          }

          // Upload to MEGA
          try {
            const storage = await getMegaStorage();
            const fileBuffer = await fs.readFile(uploadedFile.filepath);
            const uploadedMegaFile = await storage.upload(
              {
                name: fileName,
                size: fileBuffer.length,
              },
              fileBuffer,
            ).complete;

            megaFileId = uploadedMegaFile.nodeId;
            megaLink = uploadedMegaFile.link();

            await fs.unlink(uploadedFile.filepath).catch(() => {});
            console.log(`✓ File uploaded to MEGA: ${fileName}`);
          } catch (error) {
            console.error('MEGA upload failed:', error);
            await fs.unlink(uploadedFile.filepath).catch(() => {});
            return res.status(500).json({
              success: false,
              error: 'Failed to upload to MEGA storage',
              message: error.message,
            });
          }
        } else {
          console.log('No file provided - creating document without attachment');
        }

        // --- UPDATED: Insert Query (document_number may be NULL) ---
        const insertQuery = `
          INSERT INTO documents 
          (document_number, title, description, document_type, priority, signatory, file_path, mega_file_id, mega_link, file_size, uploaded_by, current_holder, status, is_archived, uploaded_at) 
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, 'pending', 0, NOW()) 
          RETURNING document_id, document_number, title, document_type, priority, signatory, status, uploaded_at
        `;

        const insertResult = await pool.query(insertQuery, [
          document_number ? sanitize(document_number) : null, // allow NULL
          sanitize(title),
          sanitize(description || ''),
          sanitize(document_type),
          sanitize(priority),
          sanitize(signatory || ''),
          fileName,
          megaFileId,
          megaLink,
          fileSize,
          userId,
        ]);

        const newDocId = insertResult.rows[0].document_id;

        // Log document creation to history
        const safeNumber = document_number ? `#${sanitize(document_number)}` : '(no manual number)';
        const action = uploadedFile ? 'Document Uploaded' : 'Document Created';
        const details = uploadedFile
          ? `Document "${sanitize(title)}" ${safeNumber} uploaded with file: ${fileName} (${(fileSize / 1024).toFixed(2)} KB)`
          : `Document "${sanitize(title)}" ${safeNumber} created without file attachment`;

        await logHistory(newDocId, userId, action, details);

        console.log(
          `✓ Document ${uploadedFile ? 'uploaded' : 'created'} successfully by user ${userId}:`,
          document_number || '(no manual number)',
        );

        return res.status(201).json({
          success: true,
          message: uploadedFile
            ? 'Document uploaded to MEGA successfully!'
            : 'Document created successfully (no file attached)',
          document: insertResult.rows[0],
          file_name: fileName,
          file_size: fileSize,
          storage: uploadedFile ? 'MEGA' : 'None',
          has_file: !!uploadedFile,
        });
      }

      case 'PATCH': {
        // Route document with TEXT-BASED destination OR user-based routing
        const body = await parseJsonBody(req);
        // --- UPDATED: Added remarks to destructuring ---
        const { document_id, new_holder, destination_text, remarks } = body;

        if (!document_id) {
          return res.status(400).json({ success: false, error: 'Document ID is required' });
        }

        // Must have either new_holder (user ID) OR destination_text (free text)
        if (!new_holder && !destination_text) {
          return res.status(400).json({ 
            success: false, 
            error: 'Either recipient user or destination text is required' 
          });
        }

        // Verify current holder or owner before routing
        const docCheck = await pool.query(
          'SELECT uploaded_by, current_holder, title FROM documents WHERE document_id = $1',
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

        // If destination_text is provided (free-text routing), use it
        if (destination_text) {
          const routeQuery = `
            UPDATE documents 
            SET status = 'routed', current_destination = $1
            WHERE document_id = $2 
            RETURNING document_id, status, current_destination
          `;

          const routeResult = await pool.query(routeQuery, [sanitize(destination_text), document_id]);

          // --- UPDATED: Include remarks in history log ---
          const actionDetails = `Document "${sanitize(doc.title)}" sent to: ${sanitize(destination_text)}` + 
                                (remarks ? ` | Remarks: ${sanitize(remarks)}` : '');
          
          await logHistory(
            document_id, 
            userId, 
            'Document Routed', 
            actionDetails
          );

          console.log(`✓ Document ${document_id} routed to destination: ${destination_text}`);

          return res.status(200).json({
            success: true,
            message: `Document routed to ${destination_text}`,
            document: routeResult.rows[0],
          });
        }

        // Otherwise, use user-based routing
        const routeQuery = `
          UPDATE documents 
          SET current_holder = $1, status = 'routed', current_destination = NULL
          WHERE document_id = $2 
          RETURNING document_id, current_holder, status
        `;

        const routeResult = await pool.query(routeQuery, [new_holder, document_id]);

        // Log routing to history
        try {
          const holderInfo = await pool.query('SELECT full_name FROM users WHERE user_id = $1', [new_holder]);
          const holderName = holderInfo.rows[0]?.full_name || 'Unknown User';
          
          // --- UPDATED: Include remarks in history log ---
          const actionDetails = `Document "${sanitize(doc.title)}" routed to ${holderName}` + 
                                (remarks ? ` | Remarks: ${sanitize(remarks)}` : '');
          
          await logHistory(
            document_id, 
            userId, 
            'Document Routed', 
            actionDetails
          );
        } catch (error) {
          console.error('Failed to get holder info for history:', error);
          await logHistory(document_id, userId, 'Document Routed', `Document routed to another user | Remarks: ${sanitize(remarks || '')}`);
        }

        return res.status(200).json({
          success: true,
          message: 'Document routed successfully!',
          document: routeResult.rows[0],
        });
      }

      case 'PUT': {
        const body = await parseJsonBody(req);
        // --- UPDATED: Added document_number to destructuring ---
        const { document_id, document_number, title, description, document_type, priority, signatory } = body;

        if (!document_id) {
          return res.status(400).json({ success: false, error: 'Document ID is required' });
        }

        // Verify ownership before updating
        const docCheck = await pool.query('SELECT uploaded_by, title as old_title, document_number as old_number FROM documents WHERE document_id = $1', [document_id]);
        if (docCheck.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Document not found' });
        }
        
        if (docCheck.rows[0].uploaded_by !== userId && userRole !== 'admin') {
          return res.status(403).json({ 
            success: false, 
            error: 'Access denied: You can only edit documents you uploaded' 
          });
        }

        // --- NEW: Check uniqueness only if document_number changed ---
        if (document_number && document_number !== docCheck.rows[0].old_number) {
            const numCheck = await pool.query('SELECT 1 FROM documents WHERE document_number = $1', [sanitize(document_number)]);
            if (numCheck.rows.length > 0) {
               return res.status(400).json({ success: false, error: 'Document Number already exists' });
            }
        }

        // --- UPDATED: Added document_number to UPDATE query ---
        const updateQuery = `
          UPDATE documents 
          SET document_number = $1, title = $2, description = $3, document_type = $4, priority = $5, signatory = $6
          WHERE document_id = $7
          RETURNING document_id, document_number, title, description, document_type, priority, signatory
        `;

        const updateResult = await pool.query(updateQuery, [
          sanitize(document_number), // New Field
          sanitize(title),
          sanitize(description || ''),
          sanitize(document_type),
          sanitize(priority),
          sanitize(signatory || ''), // New field
          document_id,
        ]);

        // Log edit to history
        await logHistory(
          document_id, 
          userId, 
          'Document Updated', 
          `Document details updated: "${sanitize(title)}" (#${sanitize(document_number)})`
        );

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

        console.log(`[DELETE] Starting deletion process for document ${deleteId} by user ${userId}`);

        // Get document info first - INCLUDE is_archived
        const docResult = await pool.query(
          'SELECT mega_file_id, uploaded_by, title, is_archived FROM documents WHERE document_id = $1',
          [deleteId]
        );
        
        if (docResult.rows.length === 0) {
          return res.status(404).json({ success: false, error: 'Document not found' });
        }

        // Verify ownership before deleting (WORKS FOR BOTH ACTIVE AND ARCHIVED)
        const doc = docResult.rows[0];
        console.log(`[DELETE] Document info:`, {
          id: deleteId,
          title: doc.title,
          uploaded_by: doc.uploaded_by,
          has_file: !!doc.mega_file_id,
          is_archived: doc.is_archived
        });

        if (doc.uploaded_by !== userId && userRole !== 'admin') {
          console.log(`Access denied: User ${userId} tried to delete document ${deleteId} uploaded by ${doc.uploaded_by}`);
          return res.status(403).json({ 
            success: false, 
            error: 'Access denied: You can only delete documents you uploaded' 
          });
        }

        // Only delete from MEGA if file exists
        if (doc.mega_file_id) {
          console.log(`[DELETE] Document has file, attempting MEGA deletion...`);
          let megaDeleted = false;

          try {
            const storage = await getMegaStorage();
            const file = await findMegaFile(storage, doc.mega_file_id);
            
            if (file) {
              await file.delete();
              megaDeleted = true;
              console.log(`✓ File deleted from MEGA: ${doc.mega_file_id}`);
            } else {
              console.log(`⚠ File not found in MEGA (may have been deleted already): ${doc.mega_file_id}`);
              megaDeleted = true; // Allow database deletion
            }
          } catch (error) {
            console.error('✗ MEGA deletion failed:', error);
            
            return res.status(500).json({
              success: false,
              error: 'Failed to delete file from MEGA storage',
              details: error.message,
              message: 'Document was not deleted to maintain data consistency. Please try again or contact support.'
            });
          }

          if (!megaDeleted) {
            return res.status(500).json({
              success: false,
              error: 'MEGA deletion did not complete successfully'
            });
          }
        } else {
          console.log(`[DELETE] Document has no file, skipping MEGA deletion`);
        }

        // Delete from database FIRST, then log to history
        try {
          console.log(`[DELETE] Attempting database deletion for document ${deleteId}...`);
          
          const deleteResult = await pool.query(
            'DELETE FROM documents WHERE document_id = $1 RETURNING document_id, title',
            [deleteId]
          );

          if (deleteResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Document not found in database' });
          }

          console.log(`✓ Document deleted from database by user ${userId}: ${deleteId} (${doc.title}) ${doc.is_archived ? '[ARCHIVED]' : '[ACTIVE]'}`);

          // Log deletion to history AFTER successful deletion
          try {
            await logHistory(
              deleteId, 
              userId, 
              'Document Deleted', 
              `Document "${sanitize(doc.title)}" permanently deleted${doc.is_archived ? ' (was archived)' : ''}${doc.mega_file_id ? ' (including file from MEGA storage)' : ' (no file was attached)'}`
            );
          } catch (historyError) {
            // Don't fail the deletion if history logging fails
            console.warn('⚠ Failed to log deletion history (document already deleted):', historyError.message);
          }

          return res.status(200).json({
            success: true,
            message: doc.mega_file_id 
              ? `Document${doc.is_archived ? ' (archived)' : ''} and file deleted successfully!` 
              : `Document${doc.is_archived ? ' (archived)' : ''} deleted successfully (no file was attached)`,
            deleted: deleteResult.rows[0],
            had_file: !!doc.mega_file_id,
            was_archived: doc.is_archived === 1
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
