import { NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxy";

export async function GET() {
  try {
    const data = await proxyGET('/api/shop/get-orders');
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