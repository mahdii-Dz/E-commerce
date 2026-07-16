import { NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function PUT(request, { params }) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;
  const { code } = await params;
  const body = await request.json();
  const data = await proxyRequest('PUT', `/api/shop/update-wilaya-stopdesk/${code}`, body);
  return NextResponse.json(data);
}
