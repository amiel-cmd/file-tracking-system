// Example API endpoint handler
const pool = require('./db');

module.exports = async function handler(req, res) {
    try {
        // Example: Get all documents
        const result = await pool.query('SELECT NOW() as current_time');
        res.status(200).json({ 
            message: 'File Tracking System API',
            status: 'running',
            data: result.rows
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
};

