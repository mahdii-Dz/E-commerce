import { NextResponse } from "next/server";
import { proxyFormData } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function POST(request) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const formData = await request.formData();
    const headers = { cookie: request.headers.get('cookie') };
    const data = await proxyFormData('/cloudinary/upload', formData, headers);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
