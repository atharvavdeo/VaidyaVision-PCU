
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const modality = formData.get("modality") as string;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Create new FormData to send to Python service
        const backendFormData = new FormData();
        // Convert file to Blob/Buffer for re-uploading
        const buffer = Buffer.from(await file.arrayBuffer());
        const blob = new Blob([buffer], { type: file.type });

        backendFormData.append("file", blob, file.name);
        backendFormData.append("modality", modality || "brain");

        // Forward to ML Service
        const mlRes = await fetch("http://localhost:8000/predict", {
            method: "POST",
            body: backendFormData,
            // Header 'Content-Type' is automatically set by fetch with boundary
        });

        if (!mlRes.ok) {
            const error = await mlRes.text();
            return NextResponse.json({ error: `ML Service Error: ${error}` }, { status: mlRes.status });
        }

        const data = await mlRes.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Predict Proxy Error:", error);
        return NextResponse.json({ error: "Failed to connect to ML Service" }, { status: 500 });
    }
}
