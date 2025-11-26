// api/file.js
const fs = require('fs');
const path = require('path');
const pool = require('./db'); // Adjust path if needed

module.exports = async (req, res) => {
    const { id } = req.query;

    if (!id) return res.status(400).send('Document ID is required');

    try {
        // 1. Get the file path from the database
        const result = await pool.query('SELECT file_path, document_type FROM documents WHERE document_id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).send('Document not found');
        }

        const doc = result.rows[0];
        const filePath = doc.file_path; // e.g., "uploads/documents/..."

        // 2. Construct absolute path (Note: Vercel /tmp limitation applies here too)
        // If files are uploaded to /tmp during runtime, they might not persist.
        // Assuming local dev or persistent storage for now:
        const absolutePath = path.join(process.cwd(), filePath); 
        // OR if uploaded to /tmp: path.join('/tmp', path.basename(filePath));

        if (!fs.existsSync(absolutePath)) {
            return res.status(404).send('File not found on server');
        }

        // 3. Serve the file
        const stat = fs.statSync(absolutePath);
        
        res.writeHead(200, {
            'Content-Type': 'application/pdf', // Simplified; use mime-types package for others
            'Content-Length': stat.size,
            'Content-Disposition': `inline; filename="document_${id}.pdf"`
        });

        const readStream = fs.createReadStream(absolutePath);
        readStream.pipe(res);

    } catch (error) {
        console.error('File serve error:', error);
        res.status(500).send('Internal Server Error');
    }
};
