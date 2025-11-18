const pool = require('../db');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/auth');
const { sanitize } = require('../utils/helpers');
const { validateLogin } = require('../utils/validation');

module.exports = async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }
    
    try {
        const { username, password } = req.body;
        
        // Validate input
        const validationErrors = validateLogin({ username, password });
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: validationErrors.join(', ') 
            });
        }
        
        const sanitizedUsername = sanitize(username);
        
        // Find user by username or email
        const query = `SELECT user_id, username, email, password, full_name, department, role, is_active 
                      FROM users 
                      WHERE (username = $1 OR email = $1) 
                      AND is_active = 1`;
        
        const result = await pool.query(query, [sanitizedUsername]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }
        
        const user = result.rows[0];
        
        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }
        
        // Generate token
        const token = generateToken(user);
        
        // Return success with token and user info
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                department: user.department
            }
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

