import { NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function DELETE(request, { params }) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const headers = { cookie: request.headers.get('cookie') };
    const data = await proxyRequest('DELETE', `/api/shop/delete-category/${id}`, null, headers);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
