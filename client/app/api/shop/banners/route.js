import { NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxy";

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
  try {
    const body = await request.json();
    const data = await proxyRequest('PUT', '/api/shop/update-banners', body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Banner update error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}