const pool = require('../db');
const { requireAuth, requireAdmin } = require('../utils/auth');

module.exports = async function handler(req, res) {
    // Chain auth middleware
    await new Promise((resolve, reject) => {
        requireAuth(req, res, (err) => {
            if (err) reject(err);
            else requireAdmin(req, res, (err2) => {
                if (err2) reject(err2);
                else resolve();
            });
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
        const { pending } = req.query;
        
        let query = 'SELECT user_id, username, email, full_name, department, role, is_active, created_at FROM users';
        const params = [];
        
        // Filter pending users (is_active = 0)
        if (pending === 'true') {
            query += ' WHERE is_active = 0';
        } else if (pending === 'false') {
            query += ' WHERE is_active = 1';
        }
        
        query += ' ORDER BY created_at DESC';
        
        const result = await pool.query(query, params);
        
        res.status(200).json({
            success: true,
            users: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Users list error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch users',
            message: error.message 
        });
    }
};

