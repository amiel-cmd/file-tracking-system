// Example API endpoint: api/example.js
// Access via: /api/example
const pool = require('./db');

module.exports = async function handler(req, res) {
    try {
        // Example query
        const result = await pool.query('SELECT * FROM users LIMIT 10');
        
        res.status(200).json({
            success: true,
            data: result.rows,
            count: result.rowCount
        });
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
};

