import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createSession } from '@/lib/sessions';

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    const res = await fetch(`${BACKEND_URL}/api/shop/workers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    if (data.success && data.token) {
      const response = NextResponse.json({
        success: true,
        worker: data.worker,
      });

      response.cookies.set('worker_session', data.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 365 * 24 * 60 * 60,
        path: '/',
      });

      const adminToken = crypto.randomBytes(32).toString('hex');
      const signedAdminToken = createSession(adminToken);
      if (signedAdminToken) {
        response.cookies.set('admin_session', signedAdminToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 365 * 24 * 60 * 60,
          path: '/',
        });
      }

      return response;
    }

    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 401 });
  } catch (error) {
    console.error('Worker login error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
