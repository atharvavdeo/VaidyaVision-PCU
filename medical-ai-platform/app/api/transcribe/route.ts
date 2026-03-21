import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized, forbidden } from "@/lib/api-auth";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// POST /api/transcribe — doctor-only proxy to faster-whisper backend
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();
        if (user.role !== "doctor") return forbidden("Transcription is available to doctors only");

        const formData = await req.formData();
        const file = formData.get("file");
        if (!file || !(file instanceof Blob)) {
            return NextResponse.json({ status: "error", error: "No audio file provided" }, { status: 400 });
        }

        // Forward to FastAPI backend
        const backendForm = new FormData();
        backendForm.append("file", file, "recording.webm");

        const backendRes = await fetch(`${ML_SERVICE_URL}/transcribe`, {
            method: "POST",
            body: backendForm,
        });

        if (!backendRes.ok) {
            return NextResponse.json(
                { status: "error", error: "Transcription service unavailable" },
                { status: 502 }
            );
        }

        const data = await backendRes.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("[POST /api/transcribe]", error);
        return NextResponse.json({ status: "error", error: "Internal Server Error" }, { status: 500 });
    }
}
