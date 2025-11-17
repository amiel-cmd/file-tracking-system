const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
    constructor() {
        // Option A: Use the single DATABASE_URL (recommended)
        this.url = process.env.DATABASE_URL || 'mysql://root@localhost:3306/file_tracking_system';
        
        this.conn = null;
        this.pool = null;
    }

    async getConnection() {
        try {
            this.conn = await mysql.createConnection(this.url);
            await this.conn.ping();
            console.log('✅ Database connected!');
            return this.conn;
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            throw error;
        }
    }

    async getPool() {
        try {
            this.pool = mysql.createPool(this.url);

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
