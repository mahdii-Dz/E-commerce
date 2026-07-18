import { NextResponse } from 'next/server';
import { proxyGET, proxyRequest } from '@/lib/proxy';

export async function GET(_, { params }) {
  try {
    const { id } = await params;
    const data = await proxyGET(`/api/shop/workers/${id}`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data = await proxyRequest('PUT', `/api/shop/workers/${id}`, body);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(_, { params }) {
  try {
    const { id } = await params;
    const data = await proxyRequest('DELETE', `/api/shop/workers/${id}`);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
