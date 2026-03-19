import { NextResponse } from "next/server";
import {  proxyRequest } from "@/lib/proxy";

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    
    const data = await proxyRequest('DELETE', `/api/shop/delete-category/${id}`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}