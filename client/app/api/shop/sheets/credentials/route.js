import { NextResponse } from "next/server";
import { proxyGET, proxyFormData } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function GET() {
  try {
    const data = await proxyGET('/api/shop/sheets/credentials');
    return NextResponse.json(data);
  } catch (error) {
    console.error('Sheets credentials GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch credential info' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const formData = await request.formData();
    const data = await proxyFormData('/api/shop/sheets/credentials', formData);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Sheets credentials POST error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
