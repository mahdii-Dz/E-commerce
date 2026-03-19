import { NextResponse } from "next/server";
import { proxyFormData, proxyRequest } from "@/lib/proxy";

export async function POST(request) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    
    // Forward to Express backend
    const data = await proxyFormData('/cloudinary/upload', formData);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
