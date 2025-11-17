const { Pool, Client } = require('pg');
require('dotenv').config();

class Database {
    constructor() {
        // Option A: Use the single DATABASE_URL (recommended)
        this.url = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/file_tracking_system';
        
        this.conn = null;
        this.pool = null;
    }

    async getConnection() {
        try {
            this.conn = new Client({ connectionString: this.url });
            await this.conn.connect();
            
            // Test connection with a simple query (PostgreSQL doesn't have ping())
            await this.conn.query('SELECT NOW()');
            
            console.log('✅ Database connected!');
            return this.conn;
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }

    async getPool() {
        try {
            this.pool = new Pool({ connectionString: this.url });

            // Test pool connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            console.log('✅ Database pool created successfully');
            return this.pool;
        } catch (error) {
            console.error('❌ Database pool creation failed:', error);
            throw error;
        }
    }

    async closeConnection() {
        if (this.conn) {
            await this.conn.end();
            console.log('Database connection closed');
        }
    }

    async closePool() {
        if (this.pool) {
            await this.pool.end();
            console.log('Database pool closed');
        }
    }

    async execute(query, params = []) {
        const conn = this.pool || this.conn;
        if (!conn) throw new Error('No database connection available');

        if (this.pool) {
            const result = await this.pool.query(query, params);
            return result.rows;
        } else {
            const result = await this.conn.query(query, params);
            return result.rows;
        }
    }

    async query(query, params = []) {
        const conn = this.pool || this.conn;
        if (!conn) throw new Error('No database connection available');

        if (this.pool) {
            const result = await this.pool.query(query, params);
            return result.rows;
        } else {
            const result = await this.conn.query(query, params);
            return result.rows;
        }
    }
}

module.exports = Database;
