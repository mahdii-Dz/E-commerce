import { NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function GET() {
  try {
    const data = await proxyGET('/api/shop/get-banners');
    return NextResponse.json(data);
  } catch (error) {
    console.error('banners proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banners' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const headers = { cookie: request.headers.get('cookie') };
    const data = await proxyRequest('PUT', '/api/shop/update-banners', body, headers);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Banner update error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
