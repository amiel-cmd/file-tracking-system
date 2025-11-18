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
    let path = req.url || '';
    const queryIndex = path.indexOf('?');
    if (queryIndex !== -1) {
        path = path.substring(0, queryIndex);
    }
    path = path.replace(/\/$/, '') || '/api';

    console.log(`Incoming request: ${req.method} ${path}`); // Debugging log

    try {
        // Route to appropriate handler
        if (path === '/api/auth/login') {
            return await require('./auth/auth')(req, res);
        }
        if (path === '/api/documents') {
            return await require('./documents/documents')(req, res);
        }
        if (path === '/api/users') {
            return await require('./users/users')(req, res);
        }

        // Root API endpoint
        if (path === '/api') {
            return res.status(200).json({
                message: 'File Tracking System API',
                status: 'running',
                version: '1.0.0',
            });
        }

        // 404 for unknown routes
        return res.status(404).json({
            success: false,
            error: 'Endpoint not found',
            path: path,
        });
    } catch (error) {
        console.error('Router error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
        });
    }
};