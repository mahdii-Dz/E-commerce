import { NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function PATCH(request, { params }) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const headers = { cookie: request.headers.get('cookie') };
    const data = await proxyRequest('PATCH', `/api/shop/sheets/${id}/toggle`, null, headers);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Sheet toggle error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
