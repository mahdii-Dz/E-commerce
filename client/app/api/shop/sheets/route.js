import { NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function GET() {
  try {
    const data = await proxyGET('/api/shop/sheets');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Sheets GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sheets' },
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
    const data = await proxyRequest('POST', '/api/shop/sheets', body, headers);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Sheets POST error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
