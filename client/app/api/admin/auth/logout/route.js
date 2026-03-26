import { NextResponse } from 'next/server';
import { invalidateSession } from '@/lib/sessions';

export async function DELETE(request) {
  const adminSessionCookie = request.cookies.get('admin_session');

  if (adminSessionCookie?.value) {
    invalidateSession(adminSessionCookie.value);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin_session');
  return response;
}
