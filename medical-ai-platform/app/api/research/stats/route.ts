import { NextResponse } from "next/server";

const ML_SERVICE = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function GET() {
    try {
        const res = await fetch(`${ML_SERVICE}/research/stats`);
        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: unknown) {
        console.error("Research stats error:", error);
        return NextResponse.json(
            { status: "error", error: "Research service unavailable" },
            { status: 500 }
        );
    }
}
