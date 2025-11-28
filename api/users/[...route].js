const pool = require('../db');
const { requireAuth, requireAdmin } = require('../utils/auth');
const bcrypt = require('bcrypt');

module.exports = async function handler(req, res) {
    console.log('DEBUG: [...route].js handler called');
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

        const routePath = url.split('?')[0];
        console.log('DEBUG: Route path:', routePath);

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

        // GET ADMIN DASHBOARD STATS - FIXED SQL SYNTAX
        if (routePath.includes('/stats') && method === 'GET') {
            console.log('DEBUG: /stats endpoint matched');
            
            const statsQuery = `
                SELECT 
                    COUNT(*) as total_users,
                    SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) as pending_users,
                    SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                    SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as total_admins,
                    SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as total_regular_users
                FROM users
            `;
            const statsResult = await pool.query(statsQuery);

            const docStatsQuery = `
                SELECT 
                    COUNT(*) as total_documents,
                    SUM(CASE WHEN is_archived = 0 THEN 1 ELSE 0 END) as active_documents,
                    SUM(CASE WHEN is_archived = 1 THEN 1 ELSE 0 END) as archived_documents,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_documents,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_documents,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_documents
                FROM documents
            `;
            const docStatsResult = await pool.query(docStatsQuery);

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

        // GET ALL USERS
        if (routePath.includes('/list') && method === 'GET') {
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

        // GET PENDING USERS
        if (routePath.includes('/pending') && method === 'GET') {
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
        if (routePath.includes('/approve') && method === 'POST') {
            console.log('DEBUG: /approve endpoint matched');
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

        // REJECT USER
        if (routePath.includes('/reject') && method === 'POST') {
            console.log('DEBUG: /reject endpoint matched');
            const body = await parseBody();
            const user_id = body.user_id;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

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

            const deleteQuery = 'DELETE FROM users WHERE user_id = $1 RETURNING user_id, username, full_name';
            const result = await pool.query(deleteQuery, [user_id]);

            console.log(`✓ User ${user_id} (${userInfo.rows[0].username}) rejected by admin`);

            return res.status(200).json({
                success: true,
                message: 'User registration rejected!',
                user: result.rows[0]
            });
        }

        // DEACTIVATE USER
        if (routePath.includes('/deactivate') && method === 'POST') {
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
        if (routePath.includes('/reactivate') && method === 'POST') {
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
        if (routePath.includes('/update-role') && method === 'POST') {
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

            console.log(`✓ User ${user_id} (${result.rows[0].username}) role changed to ${role}`);

            return res.status(200).json({
                success: true,
                message: `User role updated to ${role}!`,
                user: result.rows[0]
            });
        }

        // DELETE USER
        if (routePath.includes('/delete') && method === 'POST') {
            console.log('DEBUG: /delete endpoint matched');
            const body = await parseBody();
            const user_id = body.user_id;

            if (!user_id) {
                return res.status(400).json({
                    success: false,
                    error: 'User ID is required'
                });
            }

            const docCheck = await pool.query(
                'SELECT COUNT(*) as doc_count FROM documents WHERE uploaded_by = $1',
                [user_id]
            );

            const hasDocuments = parseInt(docCheck.rows[0].doc_count) > 0;

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

            const deleteQuery = 'DELETE FROM users WHERE user_id = $1 RETURNING user_id, username, full_name';
            const result = await pool.query(deleteQuery, [user_id]);

            console.log(`✓ User ${user_id} (${userInfo.rows[0].username}) deleted by admin`);

            return res.status(200).json({
                success: true,
                message: 'User permanently deleted!',
                user: result.rows[0],
                had_documents: hasDocuments
            });
        }

        console.log('DEBUG: No endpoint matched for url:', url);
        return res.status(405).json({
            success: false,
            error: 'Method not allowed',
            path: url
        });
    } catch (error) {
        console.error('Admin management error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
};
