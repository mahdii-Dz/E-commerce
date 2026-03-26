/**
 * Backend session validation middleware.
 * Validates admin session tokens proxied from the Next.js frontend.
 *
 * The Next.js frontend signs each request with HMAC using a shared secret.
 * Express validates the signature to ensure requests come from an authenticated admin.
 */

import crypto from 'crypto';

const SHARED_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASS;

if (!SHARED_SECRET) {
  console.warn('WARNING: SESSION_SECRET not set. Admin routes will be unprotected.');
}

/**
 * Create a session token signature for forwarding to backend.
 * Called by the frontend when proxying admin requests.
 *
 * @param {string} token - The admin_session token
 * @returns {string} - The HMAC signature (token:signature)
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
 * Verify a session token signature from the proxy.
 * Called by the backend Express server.
 *
 * @param {string} signedToken - The signed token from the Cookie header (token:signature)
 * @returns {{ valid: boolean, reason?: string }}
 */
export function verifySessionToken(signedToken) {
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
    // If no secret configured, reject all
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

/**
 * Express middleware to protect admin routes.
 * Checks for a signed admin_session cookie.
 *
 * Usage:
 *   router.put('/accept-order/:id', verifyAdminSession, acceptOrderHandler);
 */
export function verifyAdminSession(req, res, next) {
  // Get the admin_session cookie
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_session=([^;]+)/);
  const signedToken = match ? match[1] : null;

  if (!signedToken) {
    return res.status(401).json({ error: 'Unauthorized: Admin session required' });
  }

  const { valid, reason } = verifySessionToken(signedToken);

  if (!valid) {
    return res.status(401).json({ error: `Unauthorized: ${reason || 'Invalid session'}` });
  }

  next();
}

/**
 * Same as verifyAdminSession but timing-safe string comparison
 */
export function verifyAdminSessionSafe(req, res, next) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/admin_session=([^;]+)/);
  const signedToken = match ? match[1] : null;

  if (!signedToken) {
    return res.status(401).json({ error: 'Unauthorized: Admin session required' });
  }

  const { valid, reason } = verifySessionToken(signedToken);

  if (!valid) {
    return res.status(401).json({ error: `Unauthorized: ${reason || 'Invalid session'}` });
  }

  next();
}
