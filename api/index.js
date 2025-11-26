// Main API router - central entry for non-static routes

// Aggregate handlers (paths are RELATIVE to api/index.js)
// These require() calls may return either a function directly (CommonJS)
// or an object like { default: fn, config: {...} } (ESM-transpiled).
const documentsModule = require('./data/documents');      // api/data/documents.js
const usersModule = require('./users/[...route].js');              
const dashboardModule = require('./data/dashboard');      // api/data/dashboard.js

// Normalize to actual handler functions (support both CJS and ESM default export)
const documentsHandler = documentsModule.default || documentsModule;
const usersHandler = usersModule.default || usersModule;
const dashboardHandler = dashboardModule.default || dashboardModule;

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
      const authHandlerModule = require('./auth/auth'); // api/auth.js
      const authHandler = authHandlerModule.default || authHandlerModule;
      return authHandler(req, res);
    }

    // DASHBOARD DATA
    if (path === '/api/data/dashboard') {
      console.log('DEBUG: Routing to dashboardHandler');
      return dashboardHandler(req, res);
    }

    // DOCUMENTS
    if (path === '/api/data/documents') {
      console.log('DEBUG: Routing to documentsHandler');
      return documentsHandler(req, res);
    }

    // USERS - Route all /api/users* requests to usersHandler
    if (path.startsWith('/api/users')) {
      console.log('DEBUG: Routing to usersHandler for path:', path);
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
    console.log('DEBUG: No route matched for path:', path);
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


//test