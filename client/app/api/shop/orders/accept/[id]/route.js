import { NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxy";


export async function PUT(request, { params }) {
  try {
    const { id } = await params ;
    const data = await proxyRequest('PUT', `/api/shop/accept-order/${id}`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
