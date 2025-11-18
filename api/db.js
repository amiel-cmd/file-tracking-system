const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/file_tracking_system';

    try {
        pool = new Pool({
            connectionString: connectionString,
            max: parseInt(process.env.DB_POOL_LIMIT || '10', 10),
            idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
            connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
        });

        // Log successful connection
        console.log('Database pool created successfully');
    } catch (error) {
        console.error('Error creating database pool:', error.message);
        process.exit(1); // Exit the process if the pool cannot be created
    }

    // Handle pool errors
    pool.on('error', (err) => {
        console.error('Unexpected error on idle client:', err.message);
    });
}

module.exports = pool;