const pool = require('../db');
const { requireAuth } = require('../utils/auth');
const { getAllUsers } = require('../utils/helpers');

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
        const users = await getAllUsers();
        
        res.status(200).json({
            success: true,
            users: users
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

