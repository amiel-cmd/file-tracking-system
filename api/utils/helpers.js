const pool = require('../db');

// Sanitize input
function sanitize(data) {
    if (typeof data !== 'string') return data;
    return data.trim().replace(/[<>]/g, '');
}

// Generate unique document number
function generateDocumentNumber() {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `DOC-${date}-${random}`;
}

// Log document history
async function logDocumentHistory(documentId, userId, action, details = null, ipAddress = null) {
    try {
        const query = `INSERT INTO document_history (document_id, user_id, action, details, ip_address) 
                      VALUES ($1, $2, $3, $4, $5) RETURNING history_id`;
        const result = await pool.query(query, [documentId, userId, action, details, ipAddress]);
        return result.rows[0];
    } catch (error) {
        console.error('Error logging document history:', error);
        throw error;
    }
}

// Get all users for routing
async function getAllUsers() {
    try {
        const query = `SELECT user_id, full_name, department, role 
                      FROM users 
                      WHERE is_active = 1 
                      ORDER BY full_name ASC`;
        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        console.error('Error getting users:', error);
        throw error;
    }
}

// Get document routing history
async function getDocumentRoutingHistory(documentId) {
    try {
        const query = `SELECT dr.*, 
                      u_from.full_name as from_user, 
                      u_from.department as from_dept,
                      u_to.full_name as to_user,
                      u_to.department as to_dept
                      FROM document_routing dr
                      LEFT JOIN users u_from ON dr.from_user_id = u_from.user_id
                      LEFT JOIN users u_to ON dr.to_user_id = u_to.user_id
                      WHERE dr.document_id = $1
                      ORDER BY dr.routed_at DESC`;
        const result = await pool.query(query, [documentId]);
        return result.rows;
    } catch (error) {
        console.error('Error getting routing history:', error);
        throw error;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes >= 1073741824) {
        return (bytes / 1073741824).toFixed(2) + ' GB';
    } else if (bytes >= 1048576) {
        return (bytes / 1048576).toFixed(2) + ' MB';
    } else if (bytes >= 1024) {
        return (bytes / 1024).toFixed(2) + ' KB';
    } else {
        return bytes + ' bytes';
    }
}

// Get allowed file extensions
function getAllowedExtensions() {
    return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'zip'];
}

// Validate file
function validateFile(file) {
    const errors = [];
    
    if (!file || !file.buffer) {
        errors.push('File is required');
        return errors;
    }
    
    const allowed = getAllowedExtensions();
    const extension = file.originalname.split('.').pop().toLowerCase();
    
    if (!allowed.includes(extension)) {
        errors.push(`File type not allowed. Allowed types: ${allowed.join(', ')}`);
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        errors.push('File size exceeds 10MB limit');
    }
    
    return errors;
}

// Get document status badge HTML
function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="status status--warning">Pending</span>',
        'in_progress': '<span class="status status--info">In Progress</span>',
        'completed': '<span class="status status--success">Completed</span>',
        'archived': '<span class="status">Archived</span>'
    };
    
    return badges[status] || `<span class="status">${status}</span>`;
}

// Get priority badge HTML
function getPriorityBadge(priority) {
    const badges = {
        'low': '<span class="status status--info">Low</span>',
        'medium': '<span class="status status--warning">Medium</span>',
        'high': '<span class="status status--error">High</span>',
        'urgent': '<span class="status status--error">URGENT</span>'
    };
    
    return badges[priority] || `<span class="status">${priority}</span>`;
}

// Get client IP address
function getClientIp(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           null;
}

module.exports = {
    sanitize,
    generateDocumentNumber,
    logDocumentHistory,
    getAllUsers,
    getDocumentRoutingHistory,
    formatFileSize,
    getAllowedExtensions,
    validateFile,
    getStatusBadge,
    getPriorityBadge,
    getClientIp
};

