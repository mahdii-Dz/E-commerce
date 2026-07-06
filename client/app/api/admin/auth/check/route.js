import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/sessions';
import crypto from 'crypto';
import { createSession } from '@/lib/sessions';

export async function GET(request) {
  const adminSessionCookie = request.cookies.get('admin_session');

  if (!adminSessionCookie?.value) {
    return NextResponse.json({ authenticated: false, reason: 'No session' });
  }

  const { valid, reason } = validateSession(adminSessionCookie.value);

  if (!valid) {
    return NextResponse.json({ authenticated: false, reason });
  }

  // Re-issue the cookie with a fresh expiry to extend the session
  const token = crypto.randomBytes(32).toString('hex');
  const signedToken = createSession(token);

  if (!signedToken) {
    return NextResponse.json({ authenticated: true }); // fallback: still return ok
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set('admin_session', signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600,
  });
  return response;
}
