import { NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await proxyRequest("POST", "/api/shop/delete-lefted-order", body);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Delete lefted order error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
