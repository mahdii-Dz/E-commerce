import { NextResponse } from 'next/server';
import { proxyGET, proxyRequest } from '@/lib/proxy';

export async function GET() {
  try {
    const data = await proxyGET('/api/shop/workers');
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await proxyRequest('POST', '/api/shop/workers', body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
