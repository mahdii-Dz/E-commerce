import { NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await proxyGET(`/api/shop/get-product/${id}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Product proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const headers = { cookie: request.headers.get('cookie') };
    const data = await proxyRequest(
      "PUT",
      `/api/shop/update-product/${id}`,
      body,
      headers,
    );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const headers = { cookie: request.headers.get('cookie') };
    const data = await proxyRequest("DELETE", `/api/shop/delete-product/${id}`, null, headers);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
