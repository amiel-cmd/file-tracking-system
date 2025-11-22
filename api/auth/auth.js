// api/auth/auth.js
// Server-side authentication handler

const pool = require('../db');  // adjust path to your db config
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

module.exports = async function handler(req, res) {
  // Only POST allowed
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ 
      success: false, 
      error: 'Method not allowed' 
    }));
  }

  // Parse body
  let body;
  try {
    if (typeof req.body === 'string') {
      body = JSON.parse(req.body);
    } else if (req.body) {
      body = req.body;
    } else {
      // Read raw body if needed (Vercel usually auto-parses)
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      body = JSON.parse(Buffer.concat(chunks).toString());
    }
  } catch (e) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ 
      success: false, 
      error: 'Invalid JSON body' 
    }));
  }

  const { action, username, password, email, full_name } = body;

  // LOGIN
  if (action === 'login') {
    try {
      if (!username || !password) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Username and password required' 
        }));
      }

      // Query user by username or email
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR email = $1',
        [username]
      );

      if (result.rows.length === 0) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials' 
        }));
      }

      const user = result.rows[0];

      // Check if active
      if (user.is_active === 0) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Account is inactive' 
        }));
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials' 
        }));
      }

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          department: user.department
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ 
        success: true, 
        token,
        user: {
          userId: user.user_id,
          username: user.username,
          fullName: user.full_name,
          role: user.role
        }
      }));

    } catch (error) {
      console.error('Login error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ 
        success: false, 
        error: 'Server error during login' 
      }));
    }
  }

  // REGISTER
  if (action === 'register') {
    try {
      if (!username || !password || !email || !full_name) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'All fields required' 
        }));
      }

      // Check if username/email exists
      const existing = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existing.rows.length > 0) {
        res.statusCode = 409;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Username or email already exists' 
        }));
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      const result = await pool.query(
        `INSERT INTO users (username, email, password, full_name, role, is_active) 
         VALUES ($1, $2, $3, $4, 'staff', 1) 
         RETURNING user_id, username, email, full_name, role`,
        [username, email, hashedPassword, full_name]
      );

      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ 
        success: true, 
        message: 'Registration successful',
        user: result.rows[0]
      }));

    } catch (error) {
      console.error('Register error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ 
        success: false, 
        error: 'Server error during registration' 
      }));
    }
  }

  // Unknown action
  res.statusCode = 400;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ 
    success: false, 
    error: 'Unknown action. Use "login" or "register".' 
  }));
};
