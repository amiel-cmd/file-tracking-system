const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/file_tracking_system';
    
    pool = new Pool({
        connectionString: connectionString,
        max: parseInt(process.env.DB_POOL_LIMIT || '10', 10),
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
    });

    // Handle pool errors
    pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
    });
}

module.exports = pool;
