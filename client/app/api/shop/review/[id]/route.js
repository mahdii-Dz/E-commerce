import { NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function DELETE(request, { params }) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const data = await proxyRequest("DELETE", `/api/shop/reviews/${id}`, null, null);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Delete review proxy error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
