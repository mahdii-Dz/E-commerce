import { NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await proxyGET(`/api/shop/sheets/${id}`);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Sheet GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sheet' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const body = await request.json();
    const headers = { cookie: request.headers.get('cookie') };
    const data = await proxyRequest('PUT', `/api/shop/sheets/${id}`, body, headers);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Sheet PUT error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const { id } = await params;
    const headers = { cookie: request.headers.get('cookie') };
    const data = await proxyRequest('DELETE', `/api/shop/sheets/${id}`, null, headers);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Sheet DELETE error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
