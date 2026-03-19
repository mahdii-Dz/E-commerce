import { NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxy";

export async function GET(request, { params }) {
  try {
    const { id } = await params ;
    const data = await proxyGET(`/api/shop/get-products/category/${id}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Product proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 },
    );
  }
}
