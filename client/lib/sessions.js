/**
 * In-memory session store for admin authentication.
 * Sessions are stored server-side and validated on each sensitive request.
 *
 * In production, consider using Redis or a database for persistent sessions.
 */

const sessions = new Map();

const SESSION_TTL = 3600 * 1000; // 1 hour in milliseconds

/**
 * Create a new session for an admin.
 * @param {string} token - The session token (generated in auth/route.js)
 * @returns {boolean} - Whether the session was created
 */
export function createSession(token) {
  if (!token || typeof token !== 'string' || token.length !== 64) {
    return false;
  }

  const expiresAt = Date.now() + SESSION_TTL;
  sessions.set(token, { createdAt: Date.now(), expiresAt });
  return true;
}

/**
 * Validate a session token.
 * @param {string} token - The session token to validate
 * @returns {{ valid: boolean, reason?: string }}
 */
export function validateSession(token) {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Invalid token format' };
  }

  const session = sessions.get(token);

  if (!session) {
    return { valid: false, reason: 'Session not found' };
  }

  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return { valid: false, reason: 'Session expired' };
  }

  // Refresh session TTL on activity
  session.expiresAt = Date.now() + SESSION_TTL;
  sessions.set(token, session);

  return { valid: true };
}

/**
 * Invalidate (logout) a session.
 * @param {string} token - The session token to invalidate
 * @returns {boolean} - Whether the session was found and deleted
 */
export function invalidateSession(token) {
  if (!token) return false;
  return sessions.delete(token);
}

/**
 * Get all active session count (useful for debugging/admin).
 * @returns {number}
 */
export function getActiveSessionCount() {
  // Clean up expired sessions first
  const now = Date.now();
  for (const [token, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(token);
    }
  }
  return sessions.size;
}
