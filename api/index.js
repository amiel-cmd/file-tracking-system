// Main API router - handles all routes in a single serverless function
const loginHandler = require('./auth/login');
const registerHandler = require('./auth/register');
const logoutHandler = require('./auth/logout');
const uploadHandler = require('./documents/upload');
const editHandler = require('./documents/edit');
const deleteHandler = require('./documents/delete');
const routeHandler = require('./documents/route');
const archiveHandler = require('./documents/archive');
const viewHandler = require('./documents/view');
const approveHandler = require('./users/approve');
const denyHandler = require('./users/deny');
const dashboardHandler = require('./data/dashboard');
const documentsHandler = require('./data/documents');
const usersHandler = require('./data/users');
const usersListHandler = require('./data/users-list');
const documentHistoryHandler = require('./data/document-history');

module.exports = async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Parse the URL path
    // In Vercel, req.url contains the full path including /api
    let path = req.url || '';
    
    // Remove query string if present
    const queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
        path = path.substring(0, queryIndex);
    }
    
    // Normalize path (remove trailing slash except for root)
    path = path.replace(/\/$/, '') || '/api';
    
    // If path doesn't start with /api, it might be from a rewrite
    if (!path.startsWith('/api')) {
        path = '/api' + (path.startsWith('/') ? path : '/' + path);
    }
    
    // Route to appropriate handler
    try {
        // Auth routes
        if (path === '/api/auth/login' || path === '/api/auth/login.js') {
            return await loginHandler(req, res);
        }
        if (path === '/api/auth/register' || path === '/api/auth/register.js') {
            return await registerHandler(req, res);
        }
        if (path === '/api/auth/logout' || path === '/api/auth/logout.js') {
            return await logoutHandler(req, res);
        }
        
        // Document routes
        if (path === '/api/documents/upload' || path === '/api/documents/upload.js') {
            return await uploadHandler(req, res);
        }
        if (path === '/api/documents/edit' || path === '/api/documents/edit.js') {
            return await editHandler(req, res);
        }
        if (path === '/api/documents/delete' || path === '/api/documents/delete.js') {
            return await deleteHandler(req, res);
        }
        if (path === '/api/documents/route' || path === '/api/documents/route.js') {
            return await routeHandler(req, res);
        }
        if (path === '/api/documents/archive' || path === '/api/documents/archive.js') {
            return await archiveHandler(req, res);
        }
        if (path === '/api/documents/view' || path === '/api/documents/view.js') {
            return await viewHandler(req, res);
        }
        
        // User management routes
        if (path === '/api/users/approve' || path === '/api/users/approve.js') {
            return await approveHandler(req, res);
        }
        if (path === '/api/users/deny' || path === '/api/users/deny.js') {
            return await denyHandler(req, res);
        }
        
        // Data routes
        if (path === '/api/data/dashboard' || path === '/api/data/dashboard.js') {
            return await dashboardHandler(req, res);
        }
        if (path === '/api/data/documents' || path === '/api/data/documents.js') {
            return await documentsHandler(req, res);
        }
        if (path === '/api/data/users' || path === '/api/data/users.js') {
            return await usersHandler(req, res);
        }
        if (path === '/api/data/users-list' || path === '/api/data/users-list.js') {
            return await usersListHandler(req, res);
        }
        if (path === '/api/data/document-history' || path === '/api/data/document-history.js') {
            return await documentHistoryHandler(req, res);
        }
        
        // Root API endpoint
        if (path === '/api' || path === '/api/') {
            return res.status(200).json({
                message: 'File Tracking System API',
                status: 'running',
                version: '1.0.0',
                endpoints: [
                    'POST /api/auth/login',
                    'POST /api/auth/register',
                    'POST /api/auth/logout',
                    'POST /api/documents/upload',
                    'POST /api/documents/edit',
                    'POST /api/documents/delete',
                    'POST /api/documents/route',
                    'POST /api/documents/archive',
                    'GET /api/documents/view',
                    'POST /api/users/approve',
                    'POST /api/users/deny',
                    'GET /api/data/dashboard',
                    'GET /api/data/documents',
                    'GET /api/data/users',
                    'GET /api/data/users-list',
                    'GET /api/data/document-history'
                ]
            });
        }
        
        // 404 for unknown routes
        return res.status(404).json({
            success: false,
            error: 'Endpoint not found',
            path: path
        });
        
    } catch (error) {
        console.error('Router error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
};
