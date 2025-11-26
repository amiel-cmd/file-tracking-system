const pool = require('../db');
const { requireAuth, requireAdmin } = require('../utils/auth');
const { getAllUsers } = require('../utils/helpers');

module.exports = async function handler(req, res) {
    console.log('DEBUG: user.js handler called');
    console.log('DEBUG: req.method:', req.method);
    console.log('DEBUG: req.url:', req.url);

    try {
        // Chain auth middleware
        await new Promise((resolve, reject) => {
            requireAuth(req, res, (err) => {
                if (err) {
                    console.error('DEBUG: Authentication failed:', err.message);
                    reject(err);
                }
                else {
                    console.log('DEBUG: Authentication passed, checking admin');
                    requireAdmin(req, res, (err2) => {
                        if (err2) {
                            console.error('DEBUG: Admin check failed:', err2.message);
                            reject(err2);
                        }
                        else {
                            console.log('DEBUG: Admin check passed');
                            resolve();
                        }
                    });
                }
            });
        });

        const { method, url, body } = req;
        console.log('DEBUG: After auth - method:', method, 'url:', url);

        // USERS LIST
        if (url.endsWith('/list') && method === 'GET') {
            console.log('DEBUG: /list endpoint matched');
            // Fetch all users
            const users = await getAllUsers();
            return res.status(200).json({
                success: true,
                users: users,
            });
        }

        // APPROVE USER
        if (url.endsWith('/approve') && method === 'POST') {
            console.log('DEBUG: /approve endpoint matched');
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

        // DENY USER
        if (url.endsWith('/deny') && method === 'POST') {
            console.log('DEBUG: /deny endpoint matched');
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

        console.log('DEBUG: No endpoint matched for url:', url);
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            path: url,
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