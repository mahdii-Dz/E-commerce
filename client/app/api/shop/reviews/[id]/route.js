import { NextResponse } from "next/server";
import { proxyGET, proxyRequest } from "@/lib/proxy";

// GET /api/shop/reviews/:id - Fetch reviews for a product (public)
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const data = await proxyGET(`/api/shop/get-product/${id}/reviews`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Reviews proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

// POST /api/shop/reviews/:id - Add user review (public)
export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Forward to backend
    const response = await fetch(
      `${process.env.BACKEND_URL}/api/shop/add-product/${id}/review`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Add review proxy error:", error);
    return NextResponse.json(
      { error: "Failed to add review" },
      { status: 500 }
    );
  }
}
