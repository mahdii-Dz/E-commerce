import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSession } from '@/lib/sessions';

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex'); // 64 hex chars
}

export async function POST(request) {
  const { password } = await request.json();

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  if (password === process.env.ADMIN_PASS) {
    const token = generateSessionToken();
    // createSession now returns the signed "token:signature" string
    const signedToken = createSession(token);

    if (!signedToken) {
      return NextResponse.json({ success: false, error: 'Failed to create session' }, { status: 500 });
    }

    const response = NextResponse.json({ success: true });
    // Store the signed token in the cookie — no server-side state needed
    response.cookies.set('admin_session', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600,
    });
    return response;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}
