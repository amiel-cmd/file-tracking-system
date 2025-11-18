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
        const userId = req.user.userId;
        const userRole = req.user.role;
        const { status, archived, limit = 50, offset = 0 } = req.query;
        
        let query = `SELECT d.*, 
                    u.full_name as uploaded_by_name,
                    u.department as uploaded_by_department,
                    h.full_name as current_holder_name,
                    h.department as current_holder_department
                    FROM documents d
                    LEFT JOIN users u ON d.uploaded_by = u.user_id
                    LEFT JOIN users h ON d.current_holder = h.user_id
                    WHERE 1=1`;
        
        const params = [];
        let paramCount = 0;
        
        // Filter by archived status
        if (archived === 'true') {
            query += ` AND d.is_archived = 1`;
        } else {
            query += ` AND d.is_archived = 0`;
        }
        
        // Filter by user role
        if (userRole !== 'admin') {
            paramCount++;
            query += ` AND (d.uploaded_by = $${paramCount} OR d.current_holder = $${paramCount})`;
            params.push(userId);
        }
        
        // Filter by status
        if (status) {
            paramCount++;
            query += ` AND d.status = $${paramCount}`;
            params.push(status);
        }
        
        query += ` ORDER BY d.uploaded_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await pool.query(query, params);
        
        res.status(200).json({
            success: true,
            documents: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Documents list error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch documents',
            message: error.message 
        });
    }
};

