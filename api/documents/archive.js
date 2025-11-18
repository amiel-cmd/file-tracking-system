const pool = require('../db');
const { requireAuth } = require('../utils/auth');
const { sanitize, logDocumentHistory, getClientIp } = require('../utils/helpers');

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
        const { document_id, archive_reason } = req.body;
        
        if (!document_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Document ID is required' 
            });
        }
        
        const sanitizedReason = sanitize(archive_reason || 'Archived by user');
        
        // Begin transaction
        await pool.query('BEGIN');
        
        try {
            // Update document as archived
            await pool.query(
                `UPDATE documents 
                 SET is_archived = 1, status = 'archived', archived_at = NOW() 
                 WHERE document_id = $1`,
                [document_id]
            );
            
            // Insert archive record
            await pool.query(
                'INSERT INTO archived_documents (document_id, archived_by, archive_reason) VALUES ($1, $2, $3)',
                [document_id, userId, sanitizedReason]
            );
            
            // Log history
            const ipAddress = getClientIp(req);
            await logDocumentHistory(document_id, userId, 'Document Archived', sanitizedReason, ipAddress);
            
            await pool.query('COMMIT');
            
            res.status(200).json({
                success: true,
                message: 'Document archived successfully!'
            });
            
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('Archive document error:', error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to archive document: ${error.message}`,
            message: error.message 
        });
    }
};

