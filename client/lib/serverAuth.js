/**
 * Server-side session token signing utilities.
 * These functions are used by the Next.js API routes to sign session tokens
 * before forwarding to the Express backend.
 *
 * IMPORTANT: These must only be imported in server-side code (API routes).
 * Do NOT import this in client components.
 */

import crypto from 'crypto';

const SHARED_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASS;

/**
 * Create a signed session token for forwarding to the backend.
 *
 * @param {string} token - The raw admin_session token from the cookie
 * @returns {string} - The signed token (token:signature)
 */
export function signSessionToken(token) {
  if (!token || !SHARED_SECRET) return '';
  const signature = crypto
    .createHmac('sha256', SHARED_SECRET)
    .update(token)
    .digest('hex');
  return `${token}:${signature}`;
}

/**
 * Verify a signed session token.
 *
 * @param {string} signedToken - The signed token (token:signature)
 * @returns {{ valid: boolean, reason?: string }}
 */
export function verifySignedSessionToken(signedToken) {
  if (!signedToken || typeof signedToken !== 'string') {
    return { valid: false, reason: 'Missing or invalid token format' };
  }

  const parts = signedToken.split(':');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Invalid token format' };
  }

  const [token, signature] = parts;

  if (!token || !signature || token.length !== 64) {
    return { valid: false, reason: 'Invalid token or signature' };
  }

  if (!SHARED_SECRET) {
    return { valid: false, reason: 'Server misconfiguration' };
  }

  const expectedSignature = crypto
    .createHmac('sha256', SHARED_SECRET)
    .update(token)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return { valid: false, reason: 'Invalid signature' };
  }

  return { valid: true, token };
}
