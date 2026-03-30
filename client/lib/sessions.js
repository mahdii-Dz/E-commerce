/**
 * Stateless HMAC-based session validation.
 *
 * Instead of an in-memory Map (which breaks in serverless/edge environments
 * where each request may hit a fresh function instance), sessions are verified
 * using an HMAC signature baked into the cookie value itself.
 *
 * Cookie format: "<64-char-hex-token>:<64-char-hex-hmac-signature>"
 *
 * This is the same format the Express backend (sessionAuth.js) already expects,
 * so no proxy re-signing is necessary.
 */

import crypto from 'crypto';

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.ADMIN_PASS;

function signToken(token) {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(token)
    .digest('hex');
}

/**
 * Create a signed session value to store in the cookie.
 * @param {string} token - Raw 64-char hex token
 * @returns {string|false} - "token:signature" string, or false on failure
 */
export function createSession(token) {
  if (!token || typeof token !== 'string' || token.length !== 64) {
    return false;
  }

  if (!SESSION_SECRET) {
    console.error('SESSION_SECRET is not set — cannot create session.');
    return false;
  }

  const signature = signToken(token);
  return `${token}:${signature}`;
}

/**
 * Validate a signed session cookie value.
 * @param {string} signedToken - The "token:signature" value from the cookie
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateSession(signedToken) {
  if (!signedToken || typeof signedToken !== 'string') {
    return { valid: false, reason: 'Invalid token format' };
  }

  // Split at the first colon — token is 64 hex chars, signature is 64 hex chars
  const colonIndex = signedToken.indexOf(':');
  if (colonIndex === -1) {
    return { valid: false, reason: 'Invalid token format' };
  }

  const token = signedToken.slice(0, colonIndex);
  const signature = signedToken.slice(colonIndex + 1);

  if (!token || token.length !== 64 || !signature) {
    return { valid: false, reason: 'Invalid token or signature' };
  }

  if (!SESSION_SECRET) {
    return { valid: false, reason: 'Server misconfiguration' };
  }

  const expectedSignature = signToken(token);

  try {
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expectedBuffer.length) {
      return { valid: false, reason: 'Invalid session' };
    }
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, reason: 'Invalid session' };
    }
  } catch {
    return { valid: false, reason: 'Invalid session' };
  }

  return { valid: true };
}

/**
 * Invalidate a session.
 * Stateless mode: deletion is handled by clearing the cookie on the client.
 * @returns {boolean}
 */
export function invalidateSession(_token) {
  // No server-side state to clear — the cookie is deleted by the logout route.
  return true;
}

/**
 * Get active session count.
 * Not applicable in stateless mode.
 * @returns {number}
 */
export function getActiveSessionCount() {
  return 0;
}
