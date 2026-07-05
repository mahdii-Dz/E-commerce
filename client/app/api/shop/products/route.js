import { NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = queryString 
      ? `/api/shop/get-products?${queryString}`
      : '/api/shop/get-products';
    
    const data = await proxyGET(endpoint);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Products proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const headers = { cookie: request.headers.get('cookie') };
    const data = await proxyRequest('POST', '/api/shop/add-product', body, headers);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Product create error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}