import { NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(request) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const headers = { cookie: request.headers.get('cookie') };
    const data = await proxyGET('/api/shop/get-orders', headers);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Orders proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await proxyRequest('POST', '/api/shop/add-order', body);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Order create error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
