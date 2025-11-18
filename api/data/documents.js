const pool = require('./db');
const { requireAuth } = require('./utils/auth');
const { sanitize, logDocumentHistory, getClientIp } = require('./utils/helpers');
const { validateDocument, validateRouting } = require('./utils/validation');

module.exports = async function handler(req, res) {
    const { method, query, body } = req;

    try {
        switch (method) {
            case 'GET': // View document
                const documentId = query.id || query.document_id;
                if (!documentId) {
                    return res.status(400).json({ success: false, error: 'Document ID is required' });
                }
                const viewQuery = 'SELECT file_path, title FROM documents WHERE document_id = $1';
                const viewResult = await pool.query(viewQuery, [documentId]);
                if (viewResult.rows.length === 0) {
                    return res.status(404).json({ success: false, error: 'Document not found' });
                }
                return res.status(200).json({ success: true, document: viewResult.rows[0] });

            case 'POST': // Upload document
                const { title, description, document_type, priority, file } = body;
                const validationErrors = validateDocument({ title, document_type, priority });
                if (validationErrors.length > 0) {
                    return res.status(400).json({ success: false, error: validationErrors.join(', ') });
                }
                const sanitizedTitle = sanitize(title);
                const sanitizedDescription = sanitize(description || '');
                const sanitizedDocType = sanitize(document_type);
                const sanitizedPriority = sanitize(priority);
                const documentNumber = `DOC-${Date.now()}`;
                const insertQuery = `INSERT INTO documents (document_number, title, description, document_type, priority) 
                                     VALUES ($1, $2, $3, $4, $5) RETURNING document_id, document_number`;
                const insertResult = await pool.query(insertQuery, [
                    documentNumber,
                    sanitizedTitle,
                    sanitizedDescription,
                    sanitizedDocType,
                    sanitizedPriority,
                ]);
                return res.status(201).json({
                    success: true,
                    message: 'Document uploaded successfully!',
                    document: insertResult.rows[0],
                });

            case 'PUT': // Edit document
                const { document_id, newTitle, newDescription, newType, newPriority } = body;
                if (!document_id) {
                    return res.status(400).json({ success: false, error: 'Document ID is required' });
                }
                const updateQuery = `UPDATE documents SET title = $1, description = $2, document_type = $3, priority = $4 
                                     WHERE document_id = $5 RETURNING document_id, title`;
                const updateResult = await pool.query(updateQuery, [
                    sanitize(newTitle),
                    sanitize(newDescription || ''),
                    sanitize(newType),
                    sanitize(newPriority),
                    document_id,
                ]);
                return res.status(200).json({
                    success: true,
                    message: 'Document updated successfully!',
                    document: updateResult.rows[0],
                });

            case 'DELETE': // Delete document
                const deleteDocumentId = query.id || body.document_id;
                if (!deleteDocumentId) {
                    return res.status(400).json({ success: false, error: 'Document ID is required' });
                }
                const deleteQuery = 'DELETE FROM documents WHERE document_id = $1 RETURNING document_id';
                const deleteResult = await pool.query(deleteQuery, [deleteDocumentId]);
                if (deleteResult.rows.length === 0) {
                    return res.status(404).json({ success: false, error: 'Document not found' });
                }
                return res.status(200).json({ success: true, message: 'Document deleted successfully!' });

            default:
                return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Error handling documents:', error);
        return res.status(500).json({ success: false, error: 'Internal server error', message: error.message });
    }
};