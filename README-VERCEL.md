# Vercel Deployment Guide

This guide explains how to deploy the File Tracking System to Vercel.

## Prerequisites

1. A Vercel account ([vercel.com](https://vercel.com))
2. PostgreSQL database (recommended: Vercel Postgres, Supabase, or Neon)
3. Node.js 18+ (for local development)

## Environment Variables

Set the following environment variables in your Vercel project settings:

### Required Variables

```
DATABASE_URL=postgresql://username:password@host:port/database_name
```

**OR** use individual variables:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=file_tracking_system
DB_USER=postgres
DB_PASSWORD=your_password
```

### Optional Variables

```
APP_ENV=production
DB_POOL_LIMIT=10
```

## Deployment Steps

### 1. Install Vercel CLI (Optional)

```bash
npm i -g vercel
```

### 2. Deploy to Vercel

```bash
cd file-tracking-system
vercel
```

Or connect your GitHub repository to Vercel for automatic deployments.

### 3. Set Environment Variables

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add all required environment variables listed above

### 4. Redeploy

After adding environment variables, trigger a new deployment.

## File Storage

⚠️ **Important**: Vercel serverless functions have read-only filesystems.

For file uploads, use external storage services:
- **AWS S3**
- **Cloudinary**
- **Vercel Blob Storage**
- **Supabase Storage**

Update the `uploadFile()` function in `includes/functions.php` to use your chosen storage service.

## PostgreSQL Setup

### Option 1: Vercel Postgres

1. In your Vercel project, go to Storage → Create Database → Postgres
2. Vercel will automatically create a `POSTGRES_URL` environment variable
3. Update your code to use `POSTGRES_URL` instead of `DATABASE_URL`, or add:
   ```
   DATABASE_URL=$POSTGRES_URL
   ```

### Option 2: External PostgreSQL

Use services like:
- Supabase
- Neon
- Railway
- AWS RDS

## Routing

The application uses query parameter routing (`?route=dashboard`) for Vercel compatibility. This is handled automatically by the `vercel.json` configuration and `config.php`.

## API Routes

Node.js API routes are located in the `/api` directory. Currently, the main application is PHP-based, but Node.js routes can be added as needed.

## Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` is correctly set
- Check PostgreSQL connection string format
- Ensure database is accessible from Vercel's IP addresses
- Review function logs in Vercel dashboard

### File Upload Issues

- Local file storage won't work on Vercel
- Implement external storage (S3, Cloudinary, etc.)
- Update upload functions accordingly

### Session Issues

- Sessions work with Vercel's serverless environment
- Consider using external session storage (Redis) for better performance
- Verify cookie settings in `includes/session.php`

## Performance Optimization

1. **Database Connection Pooling**: Use connection pooling (configured in `db.js`)
2. **Static Assets**: Assets are cached via `vercel.json` configuration
3. **Edge Functions**: Consider using Edge Functions for better performance
4. **Caching**: Implement caching for frequently accessed data

## Support

For issues or questions:
- Check Vercel logs: Project Dashboard → Functions → Logs
- Review PHP errors in function logs
- Verify environment variables are set correctly

