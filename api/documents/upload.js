const pool = require('../db');
const { requireAuth } = require('../utils/auth');
const { sanitize, generateDocumentNumber, logDocumentHistory, validateFile, getClientIp } = require('../utils/helpers');
const { validateDocument } = require('../utils/validation');

// For Vercel, we'll need to use a cloud storage service (S3, Cloudinary, etc.)
// For now, this is a basic structure that can be adapted
async function uploadToStorage(file, fileName) {
    // TODO: Implement cloud storage upload (S3, Cloudinary, etc.)
    // For local development, you might save to a temp location
    // For production on Vercel, use cloud storage
    
    // This is a placeholder - implement based on your storage solution
    return `uploads/documents/${fileName}`;
}

module.exports = async function handler(req, res) {
    // Chain auth middleware
    await new Promise((resolve, reject) => {
        requireAuth(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }
    
    try {
        const userId = req.user.userId;
        const { title, description, document_type, priority } = req.body;
        
        // Validate document data
        const validationErrors = validateDocument({ title, document_type, priority });
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: validationErrors.join(', ') 
            });
        }
        
        // Handle file upload
        // Note: For Vercel, you'll need to use a multipart form parser or base64 encoding
        // This is a simplified version - adapt based on your frontend implementation
        let filePath = null;
        let fileSize = 0;
        
        if (req.body.file) {
            // If file is sent as base64 or URL, handle accordingly
            // For now, assuming file path is provided or needs to be uploaded to cloud storage
            const fileData = req.body.file;
            
            // Validate file if it's an actual file object
            if (fileData.buffer || fileData.data) {
                const fileValidation = validateFile(fileData);
                if (fileValidation.length > 0) {
                    return res.status(400).json({ 
                        success: false, 
                        error: fileValidation.join(', ') 
                    });
                }
                
                // Upload to cloud storage
                const fileName = `${Date.now()}_${fileData.originalname || 'document'}`;
                filePath = await uploadToStorage(fileData, fileName);
                fileSize = fileData.size || 0;
            } else if (fileData.path) {
                // If file path is already provided
                filePath = fileData.path;
                fileSize = fileData.size || 0;
            }
        }
        
        if (!filePath) {
            return res.status(400).json({ 
                success: false, 
                error: 'File is required' 
            });
        }
        
        const sanitizedTitle = sanitize(title);
        const sanitizedDescription = sanitize(description || '');
        const sanitizedDocType = sanitize(document_type);
        const sanitizedPriority = sanitize(priority);
        
        // Generate document number
        const documentNumber = generateDocumentNumber();
        
        // Insert document
        const insertQuery = `INSERT INTO documents (document_number, title, description, document_type, 
                            file_path, file_size, uploaded_by, current_holder, priority) 
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
                            RETURNING document_id, document_number`;
        
        const insertResult = await pool.query(insertQuery, [
            documentNumber,
            sanitizedTitle,
            sanitizedDescription,
            sanitizedDocType,
            filePath,
            fileSize,
            userId,
            userId,
            sanitizedPriority
        ]);
        
        const documentId = insertResult.rows[0].document_id;
        
        // Log history
        const ipAddress = getClientIp(req);
        await logDocumentHistory(
            documentId, 
            userId, 
            'Document Uploaded', 
            `Document '${sanitizedTitle}' was uploaded`,
            ipAddress
        );
        
        res.status(201).json({
            success: true,
            message: `Document uploaded successfully! Document Number: ${documentNumber}`,
            document: {
                document_id: documentId,
                document_number: documentNumber
            }
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to upload document',
            message: error.message 
        });
    }
};

