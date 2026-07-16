import { NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(request) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;
  const data = await proxyGET('/api/shop/get-delivery-stats');
  return NextResponse.json(data);
}
