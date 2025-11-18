const pool = require('../db');
const { requireAuth } = require('../utils/auth');

module.exports = async function handler(req, res) {
    // Chain auth middleware
    await new Promise((resolve, reject) => {
        requireAuth(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }
    
    try {
        const document_id = req.query.document_id || req.query.id;
        
        if (!document_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Document ID is required' 
            });
        }
        
        // Get document history
        const query = `SELECT dh.*, 
                      u.full_name as user_name,
                      u.department as user_department
                      FROM document_history dh
                      LEFT JOIN users u ON dh.user_id = u.user_id
                      WHERE dh.document_id = $1
                      ORDER BY dh.created_at DESC`;
        
        const result = await pool.query(query, [document_id]);
        
        // Get routing history
        const routingQuery = `SELECT dr.*, 
                            u_from.full_name as from_user_name,
                            u_to.full_name as to_user_name
                            FROM document_routing dr
                            LEFT JOIN users u_from ON dr.from_user_id = u_from.user_id
                            LEFT JOIN users u_to ON dr.to_user_id = u_to.user_id
                            WHERE dr.document_id = $1
                            ORDER BY dr.routed_at DESC`;
        
        const routingResult = await pool.query(routingQuery, [document_id]);
        
        res.status(200).json({
            success: true,
            history: result.rows,
            routing: routingResult.rows
        });
        
    } catch (error) {
        console.error('Document history error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch document history',
            message: error.message 
        });
    }
};

