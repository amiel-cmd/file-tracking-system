const pool = require('../db');
const { requireAuth } = require('../utils/auth');

// For Vercel, files should be served from cloud storage (S3, Cloudinary, etc.)
// This endpoint returns the file URL or redirects to the file
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
        const document_id = req.query.id || req.query.document_id;
        
        if (!document_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'Document ID is required' 
            });
        }
        
        // Get document file path
        const query = 'SELECT file_path, title FROM documents WHERE document_id = $1';
        const result = await pool.query(query, [document_id]);
        
        if (result.rows.length === 0 || !result.rows[0].file_path) {
            return res.status(404).json({ 
                success: false, 
                error: 'Document not found' 
            });
        }
        
        const document = result.rows[0];
        
        // For cloud storage, return the URL or redirect
        // For local development, you might serve the file directly
        
        // Option 1: Return the file URL (if stored in cloud storage)
        const fileUrl = document.file_path;
        
        // If it's already a full URL, redirect to it
        if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) {
            return res.redirect(fileUrl);
        }
        
        // Option 2: Return the file path/URL for the frontend to handle
        res.status(200).json({
            success: true,
            file_url: fileUrl,
            title: document.title
        });
        
        // Option 3: If you need to serve the file directly (not recommended for Vercel)
        // You would need to fetch from cloud storage and stream it
        
    } catch (error) {
        console.error('View file error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to retrieve file',
            message: error.message 
        });
    }
};

