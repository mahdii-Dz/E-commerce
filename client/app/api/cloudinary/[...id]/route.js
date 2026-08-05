import { NextResponse } from "next/server";
import { proxyRequest } from "@/lib/proxy";
import { adminAuth } from "@/lib/adminAuth";

// Catch-all for R2 keys that contain slashes (e.g. uploads/abc.png).
// The dynamic [id] route only matches a single segment, so multi-segment keys
// are rejoined here and re-encoded before being proxied to the backend.
export async function DELETE(request, { params }) {
  const auth = await adminAuth(request);
  if (auth.error) return auth.error;

  try {
    const segments = (await params).id;
    const key = Array.isArray(segments) ? segments.join("/") : segments;
    const data = await proxyRequest('DELETE', `/cloudinary/delete/${encodeURIComponent(key)}`, null, { cookie: request.headers.get('cookie') });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Cloudinary upload error:', error.message);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}