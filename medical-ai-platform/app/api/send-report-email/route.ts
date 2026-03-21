
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Deprecated: Email and WhatsApp delivery is now handled by the n8n webhook
  // configured in /api/reports/[id]/notify/route.ts
  return NextResponse.json(
    { error: "This route is deprecated. Please use POST /api/reports/[id]/notify instead." },
    { status: 410 }
  );
}
