const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
    constructor() {
        this.host = process.env.DB_HOST || 'process.env.DB_HOST';
        this.db_name = process.env.DB_NAME || 'process.env.DB_NAME';
        this.username = process.env.DB_USER || 'process.env.DB_USER';
        this.password = process.env.DB_PASSWORD || 'process.env.DB_PASSWORD';
        this.charset = 'utf8mb4';
        this.conn = null;
        this.pool = null;
    }

    async getConnection() {
        try {
            this.conn = await mysql.createConnection({
                host: this.host,
                database: this.db_name,
                user: this.username,
                password: this.password,
                charset: this.charset
            });

            await this.conn.ping();
            console.log('Database connected successfully');
            return this.conn;
        } catch (error) {
            console.error('Connection Error: ' + error.message);
            throw error;
        }
    }

    async getPool() {
        try {
            this.pool = mysql.createPool({
                host: this.host,
                database: this.db_name,
                user: this.username,
                password: this.password,
                charset: this.charset,
                waitForConnections: true,
                connectionLimit: parseInt(process.env.DB_POOL_LIMIT || '10', 10),
                queueLimit: 0
            });

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

        const [results] = await conn.execute(query, params);
        return results;
    }

    async query(query, params = []) {
        const conn = this.pool || this.conn;
        if (!conn) throw new Error('No database connection available');

        const [results] = await conn.query(query, params);
        return results;
    }
}

module.exports = Database;
