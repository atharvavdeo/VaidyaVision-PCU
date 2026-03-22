import { NextRequest, NextResponse } from "next/server";

const ML_SERVICE = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const query = body.query || "";

        if (!query.trim()) {
            return NextResponse.json({ status: "error", error: "Query is required" }, { status: 400 });
        }

        // Forward to ML service as form data
        const formData = new FormData();
        formData.append("query", query);
        if (body.top_k) formData.append("top_k", String(body.top_k));
        if (body.crawl_if_empty !== undefined) formData.append("crawl_if_empty", String(body.crawl_if_empty));

        const res = await fetch(`${ML_SERVICE}/research/ask`, {
            method: "POST",
            body: formData,
        });

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error("Research API error:", error);
        return NextResponse.json(
            { status: "error", error: error instanceof Error ? error.message : "Research service unavailable" },
            { status: 500 }
        );
    }
}
