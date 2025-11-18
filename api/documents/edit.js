const pool = require('../db');
const { requireAuth } = require('../utils/auth');
const { sanitize, logDocumentHistory, getClientIp } = require('../utils/helpers');
const { validateDocument } = require('../utils/validation');

module.exports = async function handler(req, res) {
    // Chain auth middleware
    await new Promise((resolve, reject) => {
        requireAuth(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    
    // Only allow POST/PUT
    if (req.method !== 'POST' && req.method !== 'PUT') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }
    
    try {
        const userId = req.user.userId;
        const { document_id, title, description, document_type, priority } = req.body;
        
        if (!document_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Document ID is required' 
            });
        }
        
        // Validate document data
        const validationErrors = validateDocument({ title, document_type, priority });
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: validationErrors.join(', ') 
            });
        }
        
        // Check if user owns the document
        const checkQuery = 'SELECT uploaded_by, title FROM documents WHERE document_id = $1';
        const checkResult = await pool.query(checkQuery, [document_id]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Document not found' 
            });
        }
        
        const document = checkResult.rows[0];
        
        if (document.uploaded_by !== userId) {
            return res.status(403).json({ 
                success: false, 
                error: 'You don\'t have permission to edit this document' 
            });
        }
        
        const sanitizedTitle = sanitize(title);
        const sanitizedDescription = sanitize(description || '');
        const sanitizedDocType = sanitize(document_type);
        const sanitizedPriority = sanitize(priority);
        
        // Update document
        const updateQuery = `UPDATE documents 
                            SET title = $1, description = $2, document_type = $3, priority = $4 
                            WHERE document_id = $5 
                            RETURNING document_id, title`;
        
        const updateResult = await pool.query(updateQuery, [
            sanitizedTitle,
            sanitizedDescription,
            sanitizedDocType,
            sanitizedPriority,
            document_id
        ]);
        
        // Log history
        const ipAddress = getClientIp(req);
        await logDocumentHistory(
            document_id, 
            userId, 
            'Document Updated', 
            `Document '${sanitizedTitle}' was updated`,
            ipAddress
        );
        
        res.status(200).json({
            success: true,
            message: 'Document updated successfully!',
            document: updateResult.rows[0]
        });
        
    } catch (error) {
        console.error('Edit document error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update document',
            message: error.message 
        });
    }
};

