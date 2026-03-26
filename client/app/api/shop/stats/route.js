import { NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(request) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const headers = { cookie: request.headers.get('cookie') };
    const data = await proxyGET("/api/shop/get-stats", headers);
    return NextResponse.json(data);
  } catch (error) {
    console.error("stats proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
