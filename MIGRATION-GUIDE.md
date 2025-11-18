# PHP to Node.js Migration Guide

This document explains the conversion from PHP to Node.js for Vercel deployment.

## Folder Structure

```
file-tracking-system/
├── api/
│   ├── auth/
│   │   ├── login.js          # POST /api/auth/login
│   │   ├── register.js       # POST /api/auth/register
│   │   └── logout.js         # POST /api/auth/logout
│   ├── documents/
│   │   ├── upload.js         # POST /api/documents/upload
│   │   ├── edit.js           # POST/PUT /api/documents/edit
│   │   ├── delete.js         # POST/DELETE /api/documents/delete
│   │   ├── route.js          # POST /api/documents/route
│   │   ├── archive.js         # POST /api/documents/archive
│   │   └── view.js            # GET /api/documents/view
│   ├── users/
│   │   ├── approve.js        # POST /api/users/approve (admin)
│   │   └── deny.js           # POST /api/users/deny (admin)
│   ├── data/
│   │   ├── dashboard.js      # GET /api/data/dashboard
│   │   ├── documents.js      # GET /api/data/documents
│   │   ├── users.js          # GET /api/data/users (admin)
│   │   ├── users-list.js     # GET /api/data/users-list
│   │   └── document-history.js # GET /api/data/document-history
│   ├── utils/
│   │   ├── auth.js           # Authentication utilities
│   │   ├── helpers.js        # Helper functions
│   │   └── validation.js     # Validation functions
│   ├── db.js                 # Database connection
│   └── index.js              # Main API entry point
├── vercel.json               # Vercel configuration (PHP removed)
├── package.json              # Node.js dependencies
└── API-DOCUMENTATION.md      # Complete API documentation
```

## Key Changes

### 1. Authentication
- **PHP**: Session-based authentication
- **Node.js**: JWT token-based authentication
- Tokens are sent via `Authorization: Bearer <token>` header, cookie, or query parameter

### 2. File Uploads
- **PHP**: Direct file system uploads
- **Node.js**: Cloud storage required (S3, Cloudinary, etc.)
- Vercel serverless functions don't support persistent file storage

### 3. Database
- **PHP**: PDO with PostgreSQL
- **Node.js**: `pg` library with connection pooling
- Same PostgreSQL database, different connection method

### 4. Routing
- **PHP**: Server-side routing with `index.php?route=...`
- **Node.js**: API endpoints at `/api/*`
- Frontend needs to be a SPA or static HTML with JavaScript

### 5. Error Handling
- **PHP**: Redirects with session messages
- **Node.js**: JSON responses with error objects

## Migration Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Secret key for JWT tokens
   - `JWT_EXPIRES_IN` - Token expiration (default: 7d)

3. **Update Frontend**
   - Replace PHP form submissions with fetch/axios calls
   - Store JWT token in localStorage or cookies
   - Update all API calls to use new endpoints
   - Handle JSON responses instead of redirects

4. **File Storage Setup**
   - Choose cloud storage provider (AWS S3, Cloudinary, etc.)
   - Implement `uploadToStorage()` in `api/documents/upload.js`
   - Implement `deleteFromStorage()` in `api/documents/delete.js`
   - Update file URL handling in `api/documents/view.js`

5. **Deploy to Vercel**
   ```bash
   vercel deploy
   ```

## API Endpoint Mapping

| PHP Action | Node.js Endpoint |
|------------|------------------|
| `actions/login-action.php` | `POST /api/auth/login` |
| `actions/register-action.php` | `POST /api/auth/register` |
| `actions/logout-action.php` | `POST /api/auth/logout` |
| `actions/upload-action.php` | `POST /api/documents/upload` |
| `actions/edit-document-action.php` | `POST /api/documents/edit` |
| `actions/delete-document-action.php` | `POST /api/documents/delete` |
| `actions/route-action.php` | `POST /api/documents/route` |
| `actions/archive-action.php` | `POST /api/documents/archive` |
| `actions/view-file-action.php` | `GET /api/documents/view` |
| `actions/approve-user-action.php` | `POST /api/users/approve` |
| `actions/deny-user-action.php` | `POST /api/users/deny` |

## Frontend Integration Example

### Login (Old PHP)
```php
<form action="actions/login-action.php" method="POST">
    <input name="username">
    <input name="password" type="password">
    <button type="submit">Login</button>
</form>
```

### Login (New Node.js)
```javascript
async function login(username, password) {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    if (data.success) {
        localStorage.setItem('token', data.token);
        // Redirect to dashboard
        window.location.href = '/dashboard';
    } else {
        alert(data.error);
    }
}
```

### Authenticated Request
```javascript
async function getDocuments() {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/data/documents', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    const data = await response.json();
    return data.documents;
}
```

## Notes

- All endpoints return JSON (no HTML redirects)
- Error messages are in the `error` field of the response
- Success messages are in the `message` field
- File uploads need to be converted to base64 or multipart/form-data
- Session variables are replaced with JWT token claims
- Admin checks are done via `requireAdmin` middleware

## Testing

Test endpoints using:
- Postman
- curl
- Your frontend application
- Vercel's function logs

## Support

See `API-DOCUMENTATION.md` for complete API reference.

