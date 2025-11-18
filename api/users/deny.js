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
    
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }
    
    try {
        const user_id = req.body.user_id;
        
        if (!user_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID is required' 
            });
        }
        
        // Delete user (or set is_active = 0)
        const deleteQuery = 'DELETE FROM users WHERE user_id = $1 RETURNING user_id, username, full_name';
        const result = await pool.query(deleteQuery, [user_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        res.status(200).json({
            success: true,
            message: 'User denied and removed successfully!',
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('Deny user error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to deny user',
            message: error.message 
        });
    }
};

