const { Pool, Client } = require('pg');
require('dotenv').config();

class Database {
    constructor() {
        this.host = process.env.DB_HOST;
        this.port = process.env.DB_PORT;
        this.db = process.env.DB_NAME;
        this.user = process.env.DB_USER;
        this.pass = process.env.DB_PASSWORD;
        this.conn = null;
        this.pool = null;
    }

    async getConnection() {
        try {
            const client = new Client({
                host: this.host,
                port: this.port,
                database: this.db,
                user: this.user,
                password: this.pass
            });

            await client.connect();
            
            // Test connection with a simple query
            await client.query('SELECT NOW()');
            
            this.conn = client;
            console.log('Database connected successfully');
            return this.conn;
        } catch (error) {
            console.error('Connection Error: ' + error.message);
            throw error;
        }
    }

    async getPool() {
        try {
            this.pool = new Pool({
                host: this.host,
                port: this.port,
                database: this.db,
                user: this.user,
                password: this.pass,
                max: parseInt(process.env.DB_POOL_LIMIT || '10', 10),
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 2000
            });

            // Test pool connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            console.log('Database pool created successfully');
            return this.pool;
        } catch (error) {
            console.error('Connection Error: ' + error.message);
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
