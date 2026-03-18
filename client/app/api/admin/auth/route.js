import { NextResponse } from 'next/server';

export async function POST(request) {
  const { password } = await request.json();
  
  if (password === process.env.ADMIN_PASS) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('admin_session', 'your-secure-token', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 3600 
    });
    return response;
  }
  
  return NextResponse.json({ success: false }, { status: 401 });
}