import { NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxy";

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
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await proxyRequest(
      "PUT",
      `/api/shop/update-product/${id}`,
      body,
    );
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const data = await proxyRequest("DELETE", `/api/shop/delete-product/${id}`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
