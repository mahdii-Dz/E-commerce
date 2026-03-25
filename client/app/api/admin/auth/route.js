import { NextResponse } from 'next/server';
import crypto from 'crypto';

function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function POST(request) {
  const { password } = await request.json();

  if (!password || typeof password !== 'string') {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  if (password === process.env.ADMIN_PASS) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', generateSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600
    });
    return response;
  }

  return NextResponse.json({ success: false }, { status: 401 });
}