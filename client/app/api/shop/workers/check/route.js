import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL;

export async function GET(request) {
  try {
    const token = request.cookies.get('worker_session')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    const res = await fetch(`${BACKEND_URL}/api/shop/workers/check`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Cookie': `worker_session=${token}`,
      },
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Worker session check error:', error);
    return NextResponse.json({ authenticated: false, error: error.message });
  }
}
