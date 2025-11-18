const pool = require('../db');
const { requireAuth } = require('../utils/auth');

module.exports = async function handler(req, res) {
    // Chain auth middleware
    await new Promise((resolve, reject) => {
        requireAuth(req, res, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
    
    // Only allow GET
    if (req.method !== 'GET') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }
    
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        
        // Get documents based on user role
        let documentsQuery;
        let documentsParams;
        
        if (userRole === 'admin') {
            // Admin sees all documents
            documentsQuery = `SELECT d.*, 
                            u.full_name as uploaded_by_name,
                            h.full_name as current_holder_name
                            FROM documents d
                            LEFT JOIN users u ON d.uploaded_by = u.user_id
                            LEFT JOIN users h ON d.current_holder = h.user_id
                            WHERE d.is_archived = 0
                            ORDER BY d.uploaded_at DESC
                            LIMIT 50`;
            documentsParams = [];
        } else {
            // Regular users see documents they uploaded or are current holder
            documentsQuery = `SELECT d.*, 
                            u.full_name as uploaded_by_name,
                            h.full_name as current_holder_name
                            FROM documents d
                            LEFT JOIN users u ON d.uploaded_by = u.user_id
                            LEFT JOIN users h ON d.current_holder = h.user_id
                            WHERE d.is_archived = 0 
                            AND (d.uploaded_by = $1 OR d.current_holder = $1)
                            ORDER BY d.uploaded_at DESC
                            LIMIT 50`;
            documentsParams = [userId];
        }
        
        const documentsResult = await pool.query(documentsQuery, documentsParams);
        
        // Get statistics
        let statsQuery;
        let statsParams;
        
        if (userRole === 'admin') {
            statsQuery = `SELECT 
                        COUNT(*) FILTER (WHERE is_archived = 0) as total_documents,
                        COUNT(*) FILTER (WHERE status = 'pending' AND is_archived = 0) as pending,
                        COUNT(*) FILTER (WHERE status = 'in_progress' AND is_archived = 0) as in_progress,
                        COUNT(*) FILTER (WHERE status = 'completed' AND is_archived = 0) as completed
                        FROM documents`;
            statsParams = [];
        } else {
            statsQuery = `SELECT 
                        COUNT(*) FILTER (WHERE is_archived = 0) as total_documents,
                        COUNT(*) FILTER (WHERE status = 'pending' AND is_archived = 0) as pending,
                        COUNT(*) FILTER (WHERE status = 'in_progress' AND is_archived = 0) as in_progress,
                        COUNT(*) FILTER (WHERE status = 'completed' AND is_archived = 0) as completed
                        FROM documents
                        WHERE uploaded_by = $1 OR current_holder = $1`;
            statsParams = [userId];
        }
        
        const statsResult = await pool.query(statsQuery, statsParams);
        
        res.status(200).json({
            success: true,
            documents: documentsResult.rows,
            statistics: statsResult.rows[0] || {}
        });
        
    } catch (error) {
        console.error('Dashboard data error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch dashboard data',
            message: error.message 
        });
    }
};

