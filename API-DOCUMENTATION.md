# File Tracking System - API Documentation

This document describes the Node.js API endpoints for the File Tracking System, converted from PHP for Vercel deployment.

## Authentication

All protected endpoints require a JWT token in one of the following ways:
- Header: `Authorization: Bearer <token>`
- Cookie: `token=<token>`
- Query parameter: `?token=<token>`

## Base URL

For Vercel: `https://your-app.vercel.app/api`
For local: `http://localhost:3000/api`

## API Endpoints

### Authentication Endpoints

#### POST `/api/auth/login`
Login and get JWT token.

**Request Body:**
```json
{
  "username": "user123",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "user_id": 1,
    "username": "user123",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "staff",
    "department": "IT"
  }
}
```

#### POST `/api/auth/register`
Register a new user (pending approval).

**Request Body:**
```json
{
  "full_name": "John Doe",
  "username": "user123",
  "email": "user@example.com",
  "password": "password123",
  "confirm_password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration submitted! Your account is pending approval...",
  "user": {
    "user_id": 1,
    "username": "user123",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "staff"
  }
}
```

#### POST `/api/auth/logout`
Logout (client-side token removal).

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Document Endpoints

#### POST `/api/documents/upload`
Upload a new document. **Requires authentication.**

**Request Body (multipart/form-data or JSON with base64):**
```json
{
  "title": "Document Title",
  "description": "Document description",
  "document_type": "report",
  "priority": "high",
  "file": "base64-encoded-file-or-file-object"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Document uploaded successfully! Document Number: DOC-20240101-ABC123",
  "document": {
    "document_id": 1,
    "document_number": "DOC-20240101-ABC123"
  }
}
```

#### POST/PUT `/api/documents/edit`
Edit document details. **Requires authentication. Owner only.**

**Request Body:**
```json
{
  "document_id": 1,
  "title": "Updated Title",
  "description": "Updated description",
  "document_type": "report",
  "priority": "medium"
}
```

#### POST/DELETE `/api/documents/delete`
Delete a document. **Requires authentication. Owner only.**

**Request Body:**
```json
{
  "document_id": 1
}
```

#### POST `/api/documents/route`
Route a document to another user. **Requires authentication.**

**Request Body:**
```json
{
  "document_id": 1,
  "to_user_id": 2,
  "action_taken": "review",
  "remarks": "Please review this document"
}
```

#### POST `/api/documents/archive`
Archive a document. **Requires authentication.**

**Request Body:**
```json
{
  "document_id": 1,
  "archive_reason": "Completed and archived"
}
```

#### GET `/api/documents/view?id=1`
Get document file URL. **Requires authentication.**

**Response:**
```json
{
  "success": true,
  "file_url": "https://storage.example.com/file.pdf",
  "title": "Document Title"
}
```

### Data Endpoints

#### GET `/api/data/dashboard`
Get dashboard data (documents and statistics). **Requires authentication.**

**Response:**
```json
{
  "success": true,
  "documents": [...],
  "statistics": {
    "total_documents": 10,
    "pending": 3,
    "in_progress": 5,
    "completed": 2
  }
}
```

#### GET `/api/data/documents?status=pending&archived=false&limit=50&offset=0`
Get list of documents. **Requires authentication.**

**Query Parameters:**
- `status`: Filter by status (pending, in_progress, completed, archived)
- `archived`: true/false
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

#### GET `/api/data/document-history?document_id=1`
Get document history and routing. **Requires authentication.**

**Response:**
```json
{
  "success": true,
  "history": [...],
  "routing": [...]
}
```

#### GET `/api/data/users-list`
Get list of all active users (for routing dropdowns). **Requires authentication.**

#### GET `/api/data/users?pending=true`
Get list of users. **Requires authentication and admin role.**

**Query Parameters:**
- `pending`: true/false to filter pending users

### Admin Endpoints

#### POST `/api/users/approve`
Approve a pending user. **Requires authentication and admin role.**

**Request Body:**
```json
{
  "user_id": 1
}
```

#### POST `/api/users/deny`
Deny and remove a pending user. **Requires authentication and admin role.**

**Request Body:**
```json
{
  "user_id": 1
}
```

## Error Responses

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here",
  "message": "Detailed error message (optional)"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `405` - Method Not Allowed
- `500` - Internal Server Error

## File Storage

**Important:** For Vercel deployment, files should be stored in cloud storage (AWS S3, Cloudinary, etc.) as Vercel serverless functions don't support persistent file storage.

The upload and view endpoints include placeholders for cloud storage integration. You'll need to:

1. Set up a cloud storage service (S3, Cloudinary, etc.)
2. Implement the `uploadToStorage()` function in `api/documents/upload.js`
3. Implement the `deleteFromStorage()` function in `api/documents/delete.js`
4. Update the file URL handling in `api/documents/view.js`

## Environment Variables

Required environment variables:

```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
```

Optional:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=file_tracking_system
DB_USER=postgres
DB_PASSWORD=postgres
```

## Notes

- All timestamps are in UTC
- File uploads should use multipart/form-data or base64 encoding
- JWT tokens expire after 7 days by default (configurable)
- Admin users can see all documents, regular users only see their own
- Document routing updates the current holder and status automatically

