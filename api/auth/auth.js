// api/auth.js
const pool = require('../db');
const bcrypt = require('bcrypt');
const { generateToken } = require('./utils/auth');
const { sanitize } = require('./utils/helpers');
const { validateLogin, validateRegistration } = require('./utils/validation');

// Express-like helper for res
function makeRes(res) {
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
  };
  return res;
}

// Parse JSON body from raw request
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  makeRes(res); // add status() and json()

  const { method } = req;

  try {
    const body = await parseBody(req);
    req.body = body || {};

    const { action } = req.body;

    console.log('AUTH handler:', 'method=', method, 'action=', action, 'body=', req.body);

    // LOGIN: POST /api/auth  with { action: 'login', username, password }
    if (method === 'POST' && action === 'login') {
      const { username, password } = req.body;

      const validationErrors = validateLogin({ username, password });
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: validationErrors.join(', '),
        });
      }

      const sanitizedUsername = sanitize(username);
      const query = `
        SELECT user_id, username, email, password, full_name, department, role, is_active 
        FROM users 
        WHERE (username = $1 OR email = $1) AND is_active = 1
      `;
      const result = await pool.query(query, [sanitizedUsername]);

      if (result.rows.length === 0) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const token = generateToken(user);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          department: user.department,
        },
      });
    }

    // REGISTER: POST /api/auth with { action: 'register', ... }
    if (method === 'POST' && action === 'register') {
      const { full_name, username, email, password, confirm_password } = req.body;

      const validationErrors = validateRegistration({
        full_name,
        username,
        email,
        password,
        confirm_password,
      });
      if (validationErrors.length > 0) {
        return res.status(400).json({ success: false, error: validationErrors.join(', ') });
      }

      const sanitizedFullName = sanitize(full_name);
      const sanitizedUsername = sanitize(username);
      const sanitizedEmail = sanitize(email);

      const usernameCheck = await pool.query(
        'SELECT user_id FROM users WHERE username = $1',
        [sanitizedUsername],
      );
      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Username already exists' });
      }

      const emailCheck = await pool.query(
        'SELECT user_id FROM users WHERE email = $1',
        [sanitizedEmail],
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'Email already registered' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const insertQuery = `
        INSERT INTO users (username, email, password, full_name, role, is_active) 
        VALUES ($1, $2, $3, $4, 'staff', 0)
        RETURNING user_id, username, email, full_name, role
      `;
      const insertResult = await pool.query(insertQuery, [
        sanitizedUsername,
        sanitizedEmail,
        hashedPassword,
        sanitizedFullName,
      ]);

      return res.status(201).json({
        success: true,
        message: 'Registration submitted! Your account is pending approval.',
        user: insertResult.rows[0],
      });
    }

    // LOGOUT: POST /api/auth with { action: 'logout' }
    if (method === 'POST' && action === 'logout') {
      return res.status(200).json({ success: true, message: 'Logged out successfully' });
    }

    // If no action matched
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  }
};
