import { NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function POST(request, { params }) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const headers = { cookie: request.headers.get('cookie') };

    // Forward to backend admin endpoint
    const data = await proxyRequest(
      "POST",
      `/api/shop/add-product/${id}/review/admin`,
      body,
      headers
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin review proxy error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
