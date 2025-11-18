#!/usr/bin/env node
/**
 * Generate JWT_SECRET for environment variables
 * Run: node generate-secret.js
 */

const crypto = require('crypto');

console.log('\n=== JWT_SECRET Generator ===\n');
console.log('Generated JWT_SECRET:');
console.log(crypto.randomBytes(64).toString('hex'));
console.log('\n=== Copy this value to your .env file or Vercel dashboard ===\n');
console.log('Example .env file:');
console.log('DATABASE_URL=postgresql://user:password@host:port/database');
console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('JWT_EXPIRES_IN=7d\n');

