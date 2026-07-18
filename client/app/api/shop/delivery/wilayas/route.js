import { NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(request) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;
  const data = await proxyGET('/api/shop/get-delivery-wilayas');
  return NextResponse.json(data);
}

export async function PUT(request) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;
  const body = await request.json();
  try {
    const data = await proxyRequest('PUT', '/api/shop/update-delivery-wilayas', body);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
