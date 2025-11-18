const pool = require('../db');
const { requireAuth } = require('../utils/auth');
const { sanitize, logDocumentHistory, getClientIp } = require('../utils/helpers');
const { validateRouting } = require('../utils/validation');

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
        const { document_id, to_user_id, action_taken, remarks } = req.body;
        
        // Validate input
        const validationErrors = validateRouting({ document_id, to_user_id, action_taken });
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: validationErrors.join(', ') 
            });
        }
        
        // Begin transaction
        await pool.query('BEGIN');
        
        try {
            // Get current document holder
            const docQuery = 'SELECT current_holder, status FROM documents WHERE document_id = $1';
            const docResult = await pool.query(docQuery, [document_id]);
            
            if (docResult.rows.length === 0) {
                throw new Error('Document not found');
            }
            
            const document = docResult.rows[0];
            const fromUserId = document.current_holder;
            
            // Get user names for logging
            const fromUserResult = await pool.query(
                'SELECT full_name FROM users WHERE user_id = $1',
                [fromUserId]
            );
            const fromUserName = fromUserResult.rows[0]?.full_name || 'Unknown User';
            
            const toUserResult = await pool.query(
                'SELECT full_name FROM users WHERE user_id = $1',
                [to_user_id]
            );
            const toUserName = toUserResult.rows[0]?.full_name || 'Unknown User';
            
            // Set all previous routing records for this document as not current
            await pool.query(
                'UPDATE document_routing SET is_current = 0 WHERE document_id = $1',
                [document_id]
            );
            
            // Insert new routing record with is_current = 1
            const sanitizedAction = sanitize(action_taken);
            const sanitizedRemarks = sanitize(remarks || '');
            
            await pool.query(
                `INSERT INTO document_routing (document_id, from_user_id, to_user_id, action_taken, remarks, routed_at, is_current) 
                 VALUES ($1, $2, $3, $4, $5, NOW(), 1)`,
                [document_id, fromUserId, to_user_id, sanitizedAction, sanitizedRemarks]
            );
            
            // Update document current holder and status
            const newStatus = sanitizedAction === 'completed' ? 'completed' : 'in_progress';
            
            await pool.query(
                'UPDATE documents SET current_holder = $1, status = $2 WHERE document_id = $3',
                [to_user_id, newStatus, document_id]
            );
            
            // Log history with user names
            const actionText = sanitizedAction.charAt(0).toUpperCase() + sanitizedAction.slice(1);
            const details = `Document routed from ${fromUserName} to ${toUserName}. Remarks: ${sanitizedRemarks}`;
            const ipAddress = getClientIp(req);
            
            await logDocumentHistory(document_id, userId, actionText, details, ipAddress);
            
            await pool.query('COMMIT');
            
            res.status(200).json({
                success: true,
                message: 'Document routed successfully!'
            });
            
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('Route document error:', error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to route document: ${error.message}`,
            message: error.message 
        });
    }
};

