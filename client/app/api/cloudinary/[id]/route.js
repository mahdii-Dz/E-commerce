import { NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export async function DELETE(request,{params}) {
  try {
    const {publicId} = await params;
    const data = await proxyRequest('DELETE', `/cloudinary/delete/${publicId}`);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}