// api/db.js
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({
  connectionString,
  max: parseInt(process.env.DB_POOL_LIMIT || '10', 10),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000', 10),
  ssl: {
    rejectUnauthorized: false
  }
});

console.log('Database pool created successfully');

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
});

module.exports = pool;
