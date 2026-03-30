/**
 * Backend session validation middleware.
 *
 * Accepts requests from the Next.js proxy via:
 *   Authorization: Bearer <SESSION_SECRET>
 *
 * Required env var on Render:
 *   SESSION_SECRET  — must match the value set on Netlify
 *   ADMIN_PASS      — used as fallback if SESSION_SECRET is not set
 *
 * The HMAC-signed cookie path is kept for backward compatibility.
 */

import crypto from 'crypto';

const SHARED_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASS;

if (!SHARED_SECRET) {
  console.warn(
    'WARNING: Neither SESSION_SECRET nor ADMIN_PASS is set. ' +
    'Admin routes will reject all requests.'
  );
}

// ─── Bearer-token helpers ────────────────────────────────────────────────────

/**
 * Constant-time string comparison (lengths may differ → always false).
 */
function safeEqual(a, b) {
  try {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Check the Authorization: Bearer <token> header.
 * Returns true when the token matches SHARED_SECRET.
 */
function checkBearerToken(req) {
  if (!SHARED_SECRET) return false;
  const authHeader = req.headers['authorization'] || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return safeEqual(match[1], SHARED_SECRET);
}

// ─── Cookie-HMAC helpers (legacy) ────────────────────────────────────────────

export function signSessionToken(token) {
  if (!token || !SHARED_SECRET) return '';
  return `${token}:${crypto.createHmac('sha256', SHARED_SECRET).update(token).digest('hex')}`;
}

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

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Verify admin session.
 * Accepts:
 *   1. Authorization: Bearer <SESSION_SECRET>   ← Next.js proxy requests
 *   2. Cookie: admin_session=<token:hmac>        ← legacy signed-cookie path
 */
export function verifyAdminSession(req, res, next) {
  // 1. Preferred: static bearer token (server-to-server)
  if (checkBearerToken(req)) {
    return next();
  }

  // 2. Fallback: signed admin_session cookie
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

export const verifyAdminSessionSafe = verifyAdminSession;
