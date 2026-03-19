import { NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxy";

export async function GET() {
  try {
    const data = await proxyGET("/api/shop/get-stats");
    return NextResponse.json(data);
  } catch (error) {
    console.error("stats proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
