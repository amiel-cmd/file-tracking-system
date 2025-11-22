// api/index.js
// Main API router - central entry for non-static routes

// Aggregate handlers (paths are RELATIVE to api/index.js)
const documentsHandler = require('./data/documents');   // api/data/documents.js
const usersHandler = require('./users/user');           // api/users/user.js
const dashboardHandler = require('./data/dashboard');   // api/data/dashboard.js

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    return res.end();
  }

  // Normalize path (strip query, trailing slash)
  let path = req.url || '';
  const queryIndex = path.indexOf('?');
  if (queryIndex !== -1) {
    path = path.substring(0, queryIndex);
  }
  path = path.replace(/\/$/, '') || '/api';

  console.log('Incoming request:', req.method, path);

  try {
    // AUTH: all auth actions handled by api/auth.js
    if (path === '/api/auth') {
      const authHandler = require('./auth/auth'); // api/auth.js
      return authHandler(req, res);
    }

    // DASHBOARD DATA
    if (path === '/api/data/dashboard') {
      return dashboardHandler(req, res);
    }

    // DOCUMENTS
    if (path === '/api/data/documents') {
      return documentsHandler(req, res);
    }

    // USERS
    if (path === '/api/data/users') {
      return usersHandler(req, res);
    }

    // Root API endpoint
    if (path === '/api') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(
        JSON.stringify({
          message: 'File Tracking System API',
          status: 'running',
          version: '1.0.0',
        }),
      );
    }

    // 404 for unknown routes
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        success: false,
        error: 'Endpoint not found',
        path,
      }),
    );
  } catch (error) {
    console.error('Router error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
      }),
    );
  }
};
