import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/sessions';

/**
 * Middleware to protect admin-only API routes.
 * Validates the admin_session cookie.
 *
 * Usage in route handlers:
 *   export async function POST(request) {
 *     const auth = await adminAuth(request);
 *     if (auth.error) return auth.error;
 *     // proceed with the handler logic
 *   }
 *
 * @param {Request} request - The Next.js request object
 * @returns {{ error?: NextResponse }} - Returns an error response if unauthorized, empty object if authorized
 */
export async function adminAuth(request) {
  const adminSessionCookie = request.cookies.get('admin_session');

  if (!adminSessionCookie?.value) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized: Admin session required' },
        { status: 401 }
      ),
    };
  }

  const { valid, reason } = validateSession(adminSessionCookie.value);

  if (!valid) {
    return {
      error: NextResponse.json(
        { error: `Unauthorized: ${reason || 'Invalid session'}` },
        { status: 401 }
      ),
    };
  }

  return {};
}

/**
 * Alternative: protect GET requests that return sensitive data
 * (e.g., orders with customer PII, dashboard stats)
 */
export async function adminAuthOptional(request) {
  const adminSessionCookie = request.cookies.get('admin_session');

  if (!adminSessionCookie?.value) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized: Admin session required' },
        { status: 401 }
      ),
    };
  }

  const { valid, reason } = validateSession(adminSessionCookie.value);

  if (!valid) {
    return {
      error: NextResponse.json(
        { error: `Unauthorized: ${reason || 'Invalid session'}` },
        { status: 401 }
      ),
    };
  }

  return {};
}
