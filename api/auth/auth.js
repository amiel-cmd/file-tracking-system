// api/auth/auth.js
// Server-side authentication handler

const pool = require('../db');
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
      console.log('[LOGIN] Starting login for username:', username);

      if (!username || !password) {
        console.log('[LOGIN] Missing credentials');
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Username and password required' 
        }));
      }

      console.log('[LOGIN] Querying database...');
      // Query user by username or email
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR email = $1',
        [username]
      );
      console.log('[LOGIN] Query returned', result.rows.length, 'rows');

      if (result.rows.length === 0) {
        console.log('[LOGIN] No user found');
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials' 
        }));
      }

      const user = result.rows[0];
      console.log('[LOGIN] User found:', user.username, 'is_active:', user.is_active);

      // Check if active
      if (user.is_active === 0) {
        console.log('[LOGIN] User is inactive');
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Account is inactive' 
        }));
      }

      console.log('[LOGIN] Verifying password...');
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      console.log('[LOGIN] Password valid:', validPassword);

      if (!validPassword) {
        console.log('[LOGIN] Invalid password');
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials' 
        }));
      }

      console.log('[LOGIN] Generating JWT...');
      // Generate JWT with 365 day expiry (persistent until logout)
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
        { expiresIn: '365d' }  // Token valid for 1 year (until logout)
      );

      console.log('[LOGIN] Success! Token generated');
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
      console.error('[LOGIN] Error:', error.message);
      console.error('[LOGIN] Stack:', error.stack);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ 
        success: false, 
        error: 'Server error during login',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }));
    }
  }

  // REGISTER
  if (action === 'register') {
    try {
      console.log('[REGISTER] Starting registration for username:', username);

      if (!username || !password || !email || !full_name) {
        console.log('[REGISTER] Missing required fields');
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'All fields required' 
        }));
      }

      console.log('[REGISTER] Checking for existing user...');
      // Check if username/email exists
      const existing = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existing.rows.length > 0) {
        console.log('[REGISTER] User already exists');
        res.statusCode = 409;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Username or email already exists' 
        }));
      }

      console.log('[REGISTER] Hashing password...');
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      console.log('[REGISTER] Inserting user...');
      // Insert user
      const result = await pool.query(
        `INSERT INTO users (username, email, password, full_name, role, is_active) 
         VALUES ($1, $2, $3, $4, 'staff', 1) 
         RETURNING user_id, username, email, full_name, role`,
        [username, email, hashedPassword, full_name]
      );

      console.log('[REGISTER] Success! User created:', result.rows[0].username);
      res.statusCode = 201;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ 
        success: true, 
        message: 'Registration successful',
        user: result.rows[0]
      }));

    } catch (error) {
      console.error('[REGISTER] Error:', error.message);
      console.error('[REGISTER] Stack:', error.stack);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ 
        success: false, 
        error: 'Server error during registration',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }));
    }
  }

  // Unknown action
  console.log('[AUTH] Unknown action:', action);
  res.statusCode = 400;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify({ 
    success: false, 
    error: 'Unknown action. Use "login" or "register".' 
  }));
};
