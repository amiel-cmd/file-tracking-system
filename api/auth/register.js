const pool = require('../db');
const bcrypt = require('bcrypt');
const { sanitize } = require('../utils/helpers');
const { validateRegistration } = require('../utils/validation');

module.exports = async function handler(req, res) {
    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }
    
    try {
        const { full_name, username, email, password, confirm_password } = req.body;
        
        // Validate input
        const validationErrors = validateRegistration({ 
            full_name, 
            username, 
            email, 
            password, 
            confirm_password 
        });
        
        if (validationErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: validationErrors.join(', ') 
            });
        }
        
        const sanitizedFullName = sanitize(full_name);
        const sanitizedUsername = sanitize(username);
        const sanitizedEmail = sanitize(email);
        
        // Check if username exists
        const usernameCheck = await pool.query(
            'SELECT user_id FROM users WHERE username = $1',
            [sanitizedUsername]
        );
        
        if (usernameCheck.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username already exists' 
            });
        }
        
        // Check if email exists
        const emailCheck = await pool.query(
            'SELECT user_id FROM users WHERE email = $1',
            [sanitizedEmail]
        );
        
        if (emailCheck.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email already registered' 
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Insert new user with pending status (is_active = 0)
        const insertQuery = `INSERT INTO users (username, email, password, full_name, role, is_active) 
                            VALUES ($1, $2, $3, $4, 'staff', 0) 
                            RETURNING user_id, username, email, full_name, role`;
        
        const insertResult = await pool.query(insertQuery, [
            sanitizedUsername,
            sanitizedEmail,
            hashedPassword,
            sanitizedFullName
        ]);
        
        res.status(201).json({
            success: true,
            message: 'Registration submitted! Your account is pending approval. You will be able to login once an admin approves your registration.',
            user: insertResult.rows[0]
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Registration failed. Please try again.',
            message: error.message 
        });
    }
};

