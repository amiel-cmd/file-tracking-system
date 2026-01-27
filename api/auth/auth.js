// api/auth.js
// Server-side authentication handler
// Supports JSON body (no file uploads needed for auth)

const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Vercel serverless functions use module.exports in CommonJS environments
module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ 
      success: false, 
      error: 'Method not allowed' 
    }));
  }

  // Parse body - Vercel auto-parses JSON
  let body;
  try {
    // Vercel already parses JSON bodies into req.body
    body = req.body;

    // If body is still string, parse it
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }

    // Validate body exists
    if (!body || typeof body !== 'object') {
      console.log('[AUTH] Invalid body received:', typeof body);
      res.statusCode = 400;
      return res.end(JSON.stringify({ 
        success: false, 
        error: 'Invalid request body - expected JSON' 
      }));
    }
  } catch (e) {
    console.error('[AUTH] Body parsing error:', e.message);
    res.statusCode = 400;
    return res.end(JSON.stringify({ 
      success: false, 
      error: 'Invalid JSON body' 
    }));
  }

  const { action, username, password, email, full_name, confirm_password } = body;

  console.log('[AUTH] Received action:', action);
  console.log('[AUTH] Body keys:', Object.keys(body));

  // LOGIN
  if (action === 'login') {
    try {
      console.log('[LOGIN] Starting login for username:', username);

      if (!username || !password) {
        console.log('[LOGIN] Missing credentials');
        res.statusCode = 400;
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
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials' 
        }));
      }

      const user = result.rows[0];
      console.log('[LOGIN] User found:', user.username, 'is_active:', user.is_active);

      // Check if active
      if (user.is_active === 0 || user.is_active === false) {
        console.log('[LOGIN] User is inactive - pending approval');
        res.statusCode = 403;
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Your account is pending admin approval. Please wait for approval before logging in.' 
        }));
      }

      console.log('[LOGIN] Verifying password...');
      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      console.log('[LOGIN] Password valid:', validPassword);

      if (!validPassword) {
        console.log('[LOGIN] Invalid password');
        res.statusCode = 401;
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Invalid credentials' 
        }));
      }

      console.log('[LOGIN] Generating JWT...');
      // Generate JWT with 365 day expiry
      const token = jwt.sign(
        {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '365d' }
      );

      console.log('[LOGIN] Success! Token generated');
      res.statusCode = 200;
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
      console.log('[REGISTER] Received fields:', { username, email, full_name, hasPassword: !!password });

      if (!username || !password || !email || !full_name) {
        console.log('[REGISTER] Missing required fields');
        res.statusCode = 400;
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'All fields required (username, password, email, full_name)' 
        }));
      }

      // Check password confirmation if provided
      if (confirm_password && password !== confirm_password) {
        console.log('[REGISTER] Passwords do not match');
        res.statusCode = 400;
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Passwords do not match' 
        }));
      }

      // Validate password length
      if (password.length < 6) {
        console.log('[REGISTER] Password too short');
        res.statusCode = 400;
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Password must be at least 6 characters long' 
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
        return res.end(JSON.stringify({ 
          success: false, 
          error: 'Username or email already exists' 
        }));
      }

      console.log('[REGISTER] Hashing password...');
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      console.log('[REGISTER] Inserting user with is_active = 0 (pending approval)...');
      // Insert user with is_active = 0, role = 'staff'
      const result = await pool.query(
        `INSERT INTO users (username, email, password, full_name, role, is_active) 
         VALUES ($1, $2, $3, $4, 'staff', 0) 
         RETURNING user_id, username, email, full_name, role, is_active`,
        [username, email, hashedPassword, full_name]
      );

      console.log('[REGISTER] Success! User created (pending approval):', result.rows[0].username);
      res.statusCode = 201;
      return res.end(JSON.stringify({ 
        success: true, 
        message: 'Registration successful! Your account is pending admin approval. You will be able to login once an administrator approves your account.',
        user: result.rows[0]
      }));

    } catch (error) {
      console.error('[REGISTER] Error:', error.message);
      console.error('[REGISTER] Stack:', error.stack);
      res.statusCode = 500;
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
  return res.end(JSON.stringify({ 
    success: false, 
    error: `Unknown action: "${action}". Use "login" or "register".` 
  }));
};
