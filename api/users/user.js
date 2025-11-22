const pool = require('../db');
const { requireAuth, requireAdmin } = require('../utils/auth');
const { getAllUsers } = require('../utils/helpers');

module.exports = async function handler(req, res) {
    // Chain auth middleware
    await new Promise((resolve, reject) => {
        requireAuth(req, res, (err) => {
            if (err) reject(err);
            else requireAdmin(req, res, (err2) => {
                if (err2) reject(err2);
                else resolve();
            });
        });
    });

    const { method, url, body } = req;

    try {
        if (url.endsWith('/list') && method === 'GET') {
            // Fetch all users
            const users = await getAllUsers();
            return res.status(200).json({
                success: true,
                users: users,
            });
        }

        if (url.endsWith('/approve') && method === 'POST') {
            const user_id = body.user_id;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required',
                });
            }

            // Approve user (set is_active = 1)
            const updateQuery = 'UPDATE users SET is_active = 1 WHERE user_id = $1 RETURNING user_id, username, full_name';
            const result = await pool.query(updateQuery, [user_id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }

            return res.status(200).json({
                success: true,
                message: 'User approved successfully!',
                user: result.rows[0],
            });
        }

        if (url.endsWith('/deny') && method === 'POST') {
            const user_id = body.user_id;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required',
                });
            }

            // Deny user (delete user or set is_active = 0)
            const deleteQuery = 'DELETE FROM users WHERE user_id = $1 RETURNING user_id, username, full_name';
            const result = await pool.query(deleteQuery, [user_id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found',
                });
            }

            return res.status(200).json({
                success: true,
                message: 'User denied and removed successfully!',
                user: result.rows[0],
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
        });
    } catch (error) {
        console.error('User management error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message,
        });
    }
};