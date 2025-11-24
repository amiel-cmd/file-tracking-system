// api/db.js
console.log('Environment variables:', Object.keys(process.env));
console.log('DATABASE_URL exists?', !!process.env.DATABASE_URL);

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  throw new Error('DATABASE_URL is not set');
}

// Optimized for Vercel serverless + Supabase pooler
const pool = new Pool({
  connectionString,
  max: 1, // CRITICAL: Vercel serverless should use max 1 connection
  idleTimeoutMillis: 0, // Disable idle timeout for serverless
  connectionTimeoutMillis: 10000, // 10 seconds timeout
  ssl: {
    rejectUnauthorized: false
  }
});

console.log('Database pool created successfully');

pool.on('connect', () => {
  console.log('New database connection established');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
  process.exit(-1);
});

module.exports = pool;
