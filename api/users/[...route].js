const pool = require('../db');
const { requireAuth, requireAdmin } = require('../utils/auth');
const bcrypt = require('bcrypt');

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
                } else {
                    console.log('DEBUG: Authentication passed, checking admin');
                    requireAdmin(req, res, (err2) => {
                        if (err2) {
                            console.error('DEBUG: Admin check failed:', err2.message);
                            reject(err2);
                        } else {
                            console.log('DEBUG: Admin check passed');
                            resolve();
                        }
                    });
                }
            });
        });

        const { method, url } = req;
        console.log('DEBUG: After auth - method:', method, 'url:', url);

        // Helper to parse JSON body
        const parseBody = () => {
            return new Promise((resolve, reject) => {
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', () => {
                    try {
                        resolve(body ? JSON.parse(body) : {});
                    } catch (e) {
                        reject(e);
                    }
                });
                req.on('error', reject);
            });
        };

        // GET ADMIN DASHBOARD STATS
        if (url.endsWith('/stats') && method === 'GET') {
            console.log('DEBUG: /stats endpoint matched');
            
            // Get user statistics
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(*) FILTER (WHERE is_active = 0) as pending_users,
                    COUNT(*) FILTER (WHERE is_active = 1) as active_users,
                    COUNT(*) FILTER (WHERE role = 'admin') as total_admins,
                    COUNT(*) FILTER (WHERE role = 'user') as total_regular_users
                FROM users
            `;
            const statsResult = await pool.query(statsQuery);

            // Get document statistics
            const docStatsQuery = `
                SELECT 
                    COUNT(*) as total_documents,
                    COUNT(*) FILTER (WHERE is_archived = 0) as active_documents,
                    COUNT(*) FILTER (WHERE is_archived = 1) as archived_documents,
                    COUNT(*) FILTER (WHERE status = 'pending') as pending_documents,
                    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_documents,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_documents
                FROM documents
            `;
            const docStatsResult = await pool.query(docStatsQuery);

            // Get recent activity
            const recentActivityQuery = `
                SELECT 
                    dh.action,
                    dh.details,
                    dh.created_at,
                    u.full_name as user_name,
                    d.title as document_title
                FROM document_history dh
                LEFT JOIN users u ON dh.user_id = u.user_id
                LEFT JOIN documents d ON dh.document_id = d.document_id
                ORDER BY dh.created_at DESC
                LIMIT 10
            `;
            const recentActivityResult = await pool.query(recentActivityQuery);

            return res.status(200).json({
                success: true,
                user_stats: statsResult.rows[0],
                document_stats: docStatsResult.rows[0],
                recent_activity: recentActivityResult.rows
            });
        }

        // GET ALL USERS (with filtering options)
        if (url.endsWith('/list') && method === 'GET') {
            console.log('DEBUG: /list endpoint matched');
            
            const usersQuery = `
                SELECT 
                    user_id,
                    username,
                    email,
                    full_name,
                    department,
                    role,
                    is_active,
                    created_at,
                    last_login
                FROM users
                ORDER BY created_at DESC
            `;
            const result = await pool.query(usersQuery);

            return res.status(200).json({
                success: true,
                users: result.rows
            });
        }

        // GET PENDING USERS (awaiting approval)
        if (url.endsWith('/pending') && method === 'GET') {
            console.log('DEBUG: /pending endpoint matched');
            
            const pendingQuery = `
                SELECT 
                    user_id,
                    username,
                    email,
                    full_name,
                    department,
                    created_at
                FROM users
                WHERE is_active = 0
                ORDER BY created_at DESC
            `;
            const result = await pool.query(pendingQuery);

            return res.status(200).json({
                success: true,
                pending_users: result.rows
            });
        }

        // APPROVE USER
        if (url.endsWith('/approve') && method === 'POST') {
            console.log('DEBUG: /approve endpoint matched');
            const body = await parseBody();
            const user_id = body.user_id;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            // Approve user (set is_active = 1)
            const updateQuery = `
                UPDATE users 
                SET is_active = 1 
                WHERE user_id = $1 
                RETURNING user_id, username, full_name, email
            `;
            const result = await pool.query(updateQuery, [user_id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            console.log(`✓ User ${user_id} (${result.rows[0].username}) approved by admin`);

            return res.status(200).json({
                success: true,
                message: 'User approved successfully!',
                user: result.rows[0]
            });
        }

        // REJECT/DENY USER
        if (url.endsWith('/reject') && method === 'POST') {
            console.log('DEBUG: /reject endpoint matched');
            const body = await parseBody();
            const user_id = body.user_id;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            // Get user info before deletion
            const userInfo = await pool.query(
                'SELECT username, full_name, email FROM users WHERE user_id = $1',
                [user_id]
            );

            if (userInfo.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Delete user
            const deleteQuery = 'DELETE FROM users WHERE user_id = $1 RETURNING user_id, username, full_name';
            const result = await pool.query(deleteQuery, [user_id]);

            console.log(`✓ User ${user_id} (${userInfo.rows[0].username}) rejected and removed by admin`);

            return res.status(200).json({
                success: true,
                message: 'User registration rejected and removed successfully!',
                user: result.rows[0]
            });
        }

        // DEACTIVATE USER (soft delete - set is_active = 0)
        if (url.endsWith('/deactivate') && method === 'POST') {
            console.log('DEBUG: /deactivate endpoint matched');
            const body = await parseBody();
            const user_id = body.user_id;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const updateQuery = `
                UPDATE users 
                SET is_active = 0 
                WHERE user_id = $1 
                RETURNING user_id, username, full_name
            `;
            const result = await pool.query(updateQuery, [user_id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            console.log(`✓ User ${user_id} (${result.rows[0].username}) deactivated by admin`);

            return res.status(200).json({
                success: true,
                message: 'User deactivated successfully!',
                user: result.rows[0]
            });
        }

        // REACTIVATE USER
        if (url.endsWith('/reactivate') && method === 'POST') {
            console.log('DEBUG: /reactivate endpoint matched');
            const body = await parseBody();
            const user_id = body.user_id;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const updateQuery = `
                UPDATE users 
                SET is_active = 1 
                WHERE user_id = $1 
                RETURNING user_id, username, full_name
            `;
            const result = await pool.query(updateQuery, [user_id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            console.log(`✓ User ${user_id} (${result.rows[0].username}) reactivated by admin`);

            return res.status(200).json({
                success: true,
                message: 'User reactivated successfully!',
                user: result.rows[0]
            });
        }

        // UPDATE USER ROLE
        if (url.endsWith('/update-role') && method === 'POST') {
            console.log('DEBUG: /update-role endpoint matched');
            const body = await parseBody();
            const { user_id, role } = body;

            if (!user_id || !role) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID and role are required'
                });
            }

            if (!['user', 'admin'].includes(role)) {
                return res.status(400).json({
                    success: false,
                    error: 'Role must be either "user" or "admin"'
                });
            }

            const updateQuery = `
                UPDATE users 
                SET role = $1 
                WHERE user_id = $2 
                RETURNING user_id, username, full_name, role
            `;
            const result = await pool.query(updateQuery, [role, user_id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            console.log(`✓ User ${user_id} (${result.rows[0].username}) role changed to ${role} by admin`);

            return res.status(200).json({
                success: true,
                message: `User role updated to ${role} successfully!`,
                user: result.rows[0]
            });
        }

        // DELETE USER PERMANENTLY
        if (url.endsWith('/delete') && method === 'DELETE') {
            console.log('DEBUG: /delete endpoint matched');
            const body = await parseBody();
            const user_id = body.user_id;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            // Check if user has documents
            const docCheck = await pool.query(
                'SELECT COUNT(*) as doc_count FROM documents WHERE uploaded_by = $1',
                [user_id]
            );

            const hasDocuments = parseInt(docCheck.rows[0].doc_count) > 0;

            // Get user info
            const userInfo = await pool.query(
                'SELECT username, full_name FROM users WHERE user_id = $1',
                [user_id]
            );

            if (userInfo.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Delete user
            const deleteQuery = 'DELETE FROM users WHERE user_id = $1 RETURNING user_id, username, full_name';
            const result = await pool.query(deleteQuery, [user_id]);

            console.log(`✓ User ${user_id} (${userInfo.rows[0].username}) permanently deleted by admin`);

            return res.status(200).json({
                success: true,
                message: 'User permanently deleted!',
                user: result.rows[0],
                had_documents: hasDocuments,
                warning: hasDocuments ? 'User had documents that may now be orphaned' : null
            });
        }

        // RESET USER PASSWORD (admin can reset any user's password)
        if (url.endsWith('/reset-password') && method === 'POST') {
            console.log('DEBUG: /reset-password endpoint matched');
            const body = await parseBody();
            const { user_id, new_password } = body;

            if (!user_id || !new_password) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID and new password are required'
                });
            }

            if (new_password.length < 6) {
                return res.status(400).json({
                    success: false,
                    error: 'Password must be at least 6 characters long'
                });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(new_password, 10);

            const updateQuery = `
                UPDATE users 
                SET password = $1 
                WHERE user_id = $2 
                RETURNING user_id, username, full_name
            `;
            const result = await pool.query(updateQuery, [hashedPassword, user_id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            console.log(`✓ Password reset for user ${user_id} (${result.rows[0].username}) by admin`);

            return res.status(200).json({
                success: true,
                message: 'Password reset successfully!',
                user: result.rows[0]
            });
        }

        // GET USER DETAILS BY ID
        if (url.includes('/details') && method === 'GET') {
            console.log('DEBUG: /details endpoint matched');
            
            // Extract user_id from query string
            const urlParams = new URL(req.url, `http://${req.headers.host}`);
            const user_id = urlParams.searchParams.get('id');

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            // Get user details
            const userQuery = `
                SELECT 
                    user_id,
                    username,
                    email,
                    full_name,
                    department,
                    role,
                    is_active,
                    created_at,
                    last_login
                FROM users
                WHERE user_id = $1
            `;
            const userResult = await pool.query(userQuery, [user_id]);

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            // Get user's document statistics
            const docStatsQuery = `
                SELECT 
                    COUNT(*) as total_documents,
                    COUNT(*) FILTER (WHERE is_archived = 0) as active_documents,
                    COUNT(*) FILTER (WHERE is_archived = 1) as archived_documents
                FROM documents
                WHERE uploaded_by = $1
            `;
            const docStatsResult = await pool.query(docStatsQuery, [user_id]);

            return res.status(200).json({
                success: true,
                user: userResult.rows[0],
                document_stats: docStatsResult.rows[0]
            });
        }

        console.log('DEBUG: No endpoint matched for url:', url);
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            path: url
        });
    } catch (error) {
        console.error('User management error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
};
