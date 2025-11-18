# Environment Variables Setup Guide

## Required Environment Variables

### 1. JWT_SECRET

**What it is:** A secret key used to sign and verify JWT tokens. This must be kept secret and should be a long, random string.

**How to generate:**

**Option A: Using Node.js (Recommended)**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Option B: Using OpenSSL**
```bash
openssl rand -hex 64
```

**Option C: Online Generator**
Visit: https://generate-secret.vercel.app/64
(Generate a 64-character random string)

**Example value:**
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2
```

**Important:** 
- Use a different secret for production vs development
- Never commit this to version control
- Keep it secure and don't share it

### 2. JWT_EXPIRES_IN (Optional)

**What it is:** How long JWT tokens remain valid before expiring.

**Default value:** `7d` (7 days)

**Valid formats:**
- `60` or `60s` - 60 seconds
- `5m` - 5 minutes
- `1h` - 1 hour
- `24h` - 24 hours
- `7d` - 7 days
- `30d` - 30 days
- `365d` - 1 year

**Recommended values:**
- Development: `24h` or `7d`
- Production: `1h` to `24h` (shorter is more secure)

**Example values:**
```
JWT_EXPIRES_IN=7d        # 7 days (default)
JWT_EXPIRES_IN=24h       # 24 hours
JWT_EXPIRES_IN=1h        # 1 hour (more secure)
```

### 3. DATABASE_URL

**What it is:** PostgreSQL connection string.

**Format:**
```
postgresql://username:password@host:port/database_name
```

**Example:**
```
postgresql://postgres:mypassword@localhost:5432/file_tracking_system
```

**For Vercel:** Use the connection string from your Vercel Postgres database or external PostgreSQL provider.

## Where to Set These Variables

### For Local Development

Create a `.env` file in the root of your project:

```env
# .env file (DO NOT commit this to git)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/file_tracking_system
JWT_SECRET=your-generated-secret-key-here-minimum-32-characters
JWT_EXPIRES_IN=7d
```

**Important:** Add `.env` to your `.gitignore` file!

### For Vercel Deployment

#### Method 1: Vercel Dashboard (Recommended)

1. Go to your project on [vercel.com](https://vercel.com)
2. Click on your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Name:** `DATABASE_URL`
   - **Value:** Your PostgreSQL connection string
   - **Environment:** Production, Preview, Development (select all)
   
   - **Name:** `JWT_SECRET`
   - **Value:** Your generated secret key
   - **Environment:** Production, Preview, Development (select all)
   
   - **Name:** `JWT_EXPIRES_IN` (optional)
   - **Value:** `7d` (or your preferred value)
   - **Environment:** Production, Preview, Development (select all)

5. Click **Save**

#### Method 2: Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Set environment variables
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add JWT_EXPIRES_IN
```

#### Method 3: vercel.json (Not Recommended for Secrets)

You can add non-sensitive defaults in `vercel.json`, but secrets should be set via dashboard or CLI:

```json
{
  "env": {
    "JWT_EXPIRES_IN": "7d"
  }
}
```

## Quick Setup Script

Create a file `setup-env.js` to help generate secrets:

```javascript
const crypto = require('crypto');

console.log('=== Environment Variables Setup ===\n');
console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('\nJWT_EXPIRES_IN=7d');
console.log('\nDATABASE_URL=postgresql://user:password@host:port/database');
console.log('\n=== Copy these to your .env file or Vercel dashboard ===');
```

Run it:
```bash
node setup-env.js
```

## Verification

After setting environment variables, verify they're loaded:

```javascript
// In any API file
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set ✓' : 'Missing ✗');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Missing ✗');
```

## Security Best Practices

1. **Never commit secrets to git**
   - Add `.env` to `.gitignore`
   - Use different secrets for dev/staging/production

2. **Use strong secrets**
   - Minimum 32 characters
   - Use random generation (not dictionary words)

3. **Rotate secrets periodically**
   - Change JWT_SECRET if compromised
   - Users will need to re-login after rotation

4. **Use shorter expiration in production**
   - `1h` or `24h` for production
   - `7d` is fine for development

## Troubleshooting

**Issue: "JWT_SECRET is not defined"**
- Make sure `.env` file exists locally
- Make sure variables are set in Vercel dashboard
- Restart your development server after creating `.env`

**Issue: "Invalid token" errors**
- Check that JWT_SECRET matches between environments
- Verify JWT_EXPIRES_IN format is correct
- Check that token hasn't expired

**Issue: Database connection fails**
- Verify DATABASE_URL format is correct
- Check database credentials
- Ensure database is accessible from Vercel (not localhost)

