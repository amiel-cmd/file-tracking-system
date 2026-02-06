// api/auth.js
// Server-side authentication handler (Vercel Serverless Function)
// Improvements:
// - No hardcoded JWT secret fallback (but won’t crash; returns 500 with clear message if missing)
// - Safer CORS (allowlist via env, defaults to same-origin/no wildcard)
// - Rate limiting (in-memory best-effort for warm lambdas)
// - Less sensitive logging
// - Shorter access token expiry (configurable), optional longer if you set env
// - Basic input validation & normalization

const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const ENV = process.env.NODE_ENV || 'production';

// Comma-separated list of allowed origins, e.g.
// ALLOWED_ORIGINS="https://yourapp.vercel.app,http://localhost:3000"
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// JWT secret (no insecure fallback)
const JWT_SECRET = process.env.JWT_SECRET;

// Token expiry (keep configurable)
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '1h'; // recommended
// If you really want the old behavior, set ACCESS_TOKEN_EXPIRES_IN="365d"

// Best-effort in-memory rate limiter (works only per warm instance)
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.AUTH_RATE_WINDOW_MS || '60000', 10); // 60s
const RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_MAX || '20', 10); // 20 req/min/IP
const _rate = global.__AUTH_RATE_LIMIT__ || (global.__AUTH_RATE_LIMIT__ = new Map());

function getClientIp(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0].trim();
  if (Array.isArray(xf) && xf.length) return xf[0];
  return req.socket?.remoteAddress || 'unknown';
}

function rateLimit(req) {
  const ip = getClientIp(req);
  const now = Date.now();
  const entry = _rate.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  entry.count += 1;
  _rate.set(ip, entry);

  const remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
  return { allowed: entry.count <= RATE_LIMIT_MAX, remaining, resetAt: entry.resetAt };
}

function setCors(req, res) {
  const origin = req.headers.origin;

  // If you explicitly configured origins, enforce allowlist
  if (ALLOWED_ORIGINS.length > 0) {
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
  } else {
    // If not configured, do NOT default to "*"
    // This keeps it safer by default (same-origin calls will still work).
    // You can set ALLOWED_ORIGINS to enable cross-site frontend usage.
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(payload));
}

function normalizeString(v) {
  if (typeof v !== 'string') return '';
  return v.trim();
}

module.exports = async function handler(req, res) {
  // CORS + content type
  res.setHeader('Content-Type', 'application/json');
  setCors(req, res);

  // Preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  // Only POST
  if (req.method !== 'POST') {
    return json(res, 405, { success: false, error: 'Method not allowed' });
  }

  // Rate limit (best effort)
  const rl = rateLimit(req);
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(rl.resetAt / 1000)));
  if (!rl.allowed) {
    return json(res, 429, { success: false, error: 'Too many requests. Please try again later.' });
  }

  // Parse body - Vercel typically provides req.body already
  let body;
  try {
    body = req.body;
    if (typeof body === 'string') body = JSON.parse(body);
    if (!body || typeof body !== 'object') {
      return json(res, 400, { success: false, error: 'Invalid request body - expected JSON' });
    }
  } catch (e) {
    return json(res, 400, { success: false, error: 'Invalid JSON body' });
  }

  const action = normalizeString(body.action);
  const username = normalizeString(body.username);
  const password = typeof body.password === 'string' ? body.password : '';
  const email = normalizeString(body.email);
  const full_name = normalizeString(body.full_name);
  const confirm_password = typeof body.confirm_password === 'string' ? body.confirm_password : '';

  // Avoid noisy/sensitive logs in production
  if (ENV === 'development') {
    console.log('[AUTH] action:', action);
  }

  // LOGIN
  if (action === 'login') {
    try {
      if (!username || !password) {
        return json(res, 400, { success: false, error: 'Username and password required' });
      }

      // Query user by username or email
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR email = $1',
        [username]
      );

      // Don’t leak whether user exists
      if (result.rows.length === 0) {
        return json(res, 401, { success: false, error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Check if active
      if (user.is_active === 0 || user.is_active === false) {
        return json(res, 403, {
          success: false,
          error: 'Your account is pending admin approval. Please wait for approval before logging in.'
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return json(res, 401, { success: false, error: 'Invalid credentials' });
      }

      // Ensure JWT secret exists (don’t crash the app; return a clear error)
      if (!JWT_SECRET) {
        return json(res, 500, {
          success: false,
          error: 'Server misconfiguration: JWT secret is not set.'
        });
      }

      // Generate JWT
      const token = jwt.sign(
        {
          userId: user.user_id,
          username: user.username,
          email: user.email,
          fullName: user.full_name,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
      );

      return json(res, 200, {
        success: true,
        token,
        user: {
          userId: user.user_id,
          username: user.username,
          fullName: user.full_name,
          role: user.role
        }
      });
    } catch (error) {
      if (ENV === 'development') {
        console.error('[LOGIN] Error:', error.message);
        console.error(error.stack);
      }
      return json(res, 500, {
        success: false,
        error: 'Server error during login',
        details: ENV === 'development' ? error.message : undefined
      });
    }
  }

  // REGISTER
  if (action === 'register') {
    try {
      if (!username || !password || !email || !full_name) {
        return json(res, 400, {
          success: false,
          error: 'All fields required (username, password, email, full_name)'
        });
      }

      // Password confirmation (if provided)
      if (confirm_password && password !== confirm_password) {
        return json(res, 400, { success: false, error: 'Passwords do not match' });
      }

      // Password length
      if (password.length < 8) {
        // Bumped from 6 -> 8 for baseline security
        return json(res, 400, { success: false, error: 'Password must be at least 8 characters long' });
      }

      // Very basic email sanity check
      if (!email.includes('@') || email.length > 254) {
        return json(res, 400, { success: false, error: 'Invalid email address' });
      }

      // Check if username/email exists
      const existing = await pool.query(
        'SELECT 1 FROM users WHERE username = $1 OR email = $2',
        [username, email]
      );

      if (existing.rows.length > 0) {
        return json(res, 409, { success: false, error: 'Username or email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12); // slightly stronger than 10

      // Insert user with is_active = 0, role = 'staff'
      const result = await pool.query(
        `INSERT INTO users (username, email, password, full_name, role, is_active)
         VALUES ($1, $2, $3, $4, 'staff', 0)
         RETURNING user_id, username, email, full_name, role, is_active`,
        [username, email, hashedPassword, full_name]
      );

      return json(res, 201, {
        success: true,
        message:
          'Registration successful! Your account is pending admin approval. You will be able to login once an administrator approves your account.',
        user: result.rows[0]
      });
    } catch (error) {
      if (ENV === 'development') {
        console.error('[REGISTER] Error:', error.message);
        console.error(error.stack);
      }
      return json(res, 500, {
        success: false,
        error: 'Server error during registration',
        details: ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Unknown action
  return json(res, 400, {
    success: false,
    error: `Unknown action: "${action}". Use "login" or "register".`
  });
};
