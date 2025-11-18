const jwt = require('jsonwebtoken');
const pool = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
function generateToken(user) {
    const payload = {
        userId: user.user_id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
        department: user.department
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Get user from token
function getUserFromToken(token) {
    const decoded = verifyToken(token);
    if (!decoded) return null;
    return decoded;
}

// Middleware to require authentication
async function requireAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '') || 
                     req.cookies?.token || 
                     req.query?.token;
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }
        
        const user = getUserFromToken(token);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid or expired token' 
            });
        }
        
        // Verify user still exists and is active
        const result = await pool.query(
            'SELECT user_id, username, email, full_name, department, role, is_active FROM users WHERE user_id = $1',
            [user.userId]
        );
        
        if (result.rows.length === 0 || !result.rows[0].is_active) {
            return res.status(401).json({ 
                success: false, 
                error: 'User account is inactive or deleted' 
            });
        }
        
        req.user = {
            ...user,
            ...result.rows[0]
        };
        
        if (next) next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ 
            success: false, 
            error: 'Authentication error' 
        });
    }
}

// Middleware to require admin role
function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            error: 'Admin privileges required' 
        });
    }
    if (next) next();
}

// Helper to wrap auth middleware for Vercel functions
async function withAuth(handler) {
    return async function(req, res) {
        try {
            const token = req.headers.authorization?.replace('Bearer ', '') || 
                         req.cookies?.token || 
                         req.query?.token;
            
            if (!token) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Authentication required' 
                });
            }
            
            const user = getUserFromToken(token);
            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'Invalid or expired token' 
                });
            }
            
            // Verify user still exists and is active
            const result = await pool.query(
                'SELECT user_id, username, email, full_name, department, role, is_active FROM users WHERE user_id = $1',
                [user.userId]
            );
            
            if (result.rows.length === 0 || !result.rows[0].is_active) {
                return res.status(401).json({ 
                    success: false, 
                    error: 'User account is inactive or deleted' 
                });
            }
            
            req.user = {
                ...user,
                ...result.rows[0]
            };
            
            return handler(req, res);
        } catch (error) {
            console.error('Auth error:', error);
            return res.status(500).json({ 
                success: false, 
                error: 'Authentication error' 
            });
        }
    };
}

// Helper to wrap auth + admin middleware
async function withAdmin(handler) {
    return withAuth(async function(req, res) {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: 'Admin privileges required' 
            });
        }
        return handler(req, res);
    });
}

module.exports = {
    generateToken,
    verifyToken,
    getUserFromToken,
    requireAuth,
    requireAdmin,
    withAuth,
    withAdmin
};

