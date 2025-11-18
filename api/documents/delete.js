const pool = require('../db');
const { requireAuth } = require('../utils/auth');
const { getClientIp } = require('../utils/helpers');

// For Vercel, file deletion from cloud storage needs to be implemented
async function deleteFromStorage(filePath) {
    // TODO: Implement cloud storage deletion (S3, Cloudinary, etc.)
    // This is a placeholder
    return true;
}

module.exports = async function handler(req, res) {
    // Chain auth middleware
    await new Promise((resolve, reject) => {
        requireAuth(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    
    // Only allow POST/DELETE
    if (req.method !== 'POST' && req.method !== 'DELETE') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }
    
    try {
        const userId = req.user.userId;
        const document_id = req.body.document_id || req.query.document_id;
        
        if (!document_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Document ID is required' 
            });
        }
        
        // Check if user owns the document
        const checkQuery = 'SELECT uploaded_by, file_path, title FROM documents WHERE document_id = $1';
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
                error: 'You don\'t have permission to delete this document' 
            });
        }
        
        // Begin transaction
        await pool.query('BEGIN');
        
        try {
            // Delete file from storage if exists
            if (document.file_path) {
                await deleteFromStorage(document.file_path);
            }
            
            // Delete routing records
            await pool.query('DELETE FROM document_routing WHERE document_id = $1', [document_id]);
            
            // Delete history records
            await pool.query('DELETE FROM document_history WHERE document_id = $1', [document_id]);
            
            // Delete archived records if exists
            await pool.query('DELETE FROM archived_documents WHERE document_id = $1', [document_id]);
            
            // Delete document
            await pool.query('DELETE FROM documents WHERE document_id = $1', [document_id]);
            
            await pool.query('COMMIT');
            
            res.status(200).json({
                success: true,
                message: 'Document deleted successfully!'
            });
            
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('Delete document error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete document',
            message: error.message 
        });
    }
};

