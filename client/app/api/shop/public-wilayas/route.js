import { NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxy";

export async function GET() {
  try {
    const data = await proxyGET('/api/shop/get-public-wilayas');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Public wilayas proxy error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
}
