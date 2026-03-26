import { NextResponse } from 'next/server';
import { validateSession } from '@/lib/sessions';

export async function GET(request) {
  const adminSessionCookie = request.cookies.get('admin_session');

  if (!adminSessionCookie?.value) {
    return NextResponse.json({ authenticated: false, reason: 'No session' });
  }

  const { valid, reason } = validateSession(adminSessionCookie.value);

  if (!valid) {
    return NextResponse.json({ authenticated: false, reason });
  }

  return NextResponse.json({ authenticated: true });
}
