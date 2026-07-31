import { NextResponse } from "next/server";

function formatPhone(phone) {
  let p = String(phone || "").trim();
  if (p.startsWith("+213")) return p;
  if (p.startsWith("0")) return "+213" + p.slice(1);
  return "+213" + p;
}

export async function GET(request) {
  const phone = formatPhone(request.nextUrl.searchParams.get("phone") || "");
  if (!phone || phone === "+213") {
    return NextResponse.json({ error: "No phone number provided" }, { status: 400 });
  }
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=tel:${encodeURIComponent(phone)}">
  <title>Calling...</title>
</head>
<body>
  <p>Redirecting to call ${phone}...</p>
</body>
</html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
