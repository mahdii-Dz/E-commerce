import { NextResponse } from "next/server";
import { proxyGET } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(request, { params }) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;
  const { code } = await params;
  const data = await proxyGET(`/api/shop/get-wilaya-baladiyas/${code}`);
  return NextResponse.json(data);
}
