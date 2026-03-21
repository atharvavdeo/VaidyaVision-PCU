import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

/**
 * POST /api/ocr — Extract text from a medical document and clean it with Groq.
 * Proxies to ML service's /ocr/clean-report endpoint.
 */
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // Forward to ML service for OCR + cleaning
        const mlFormData = new FormData();
        mlFormData.append("file", file);

        const mlRes = await fetch(`${ML_SERVICE_URL}/ocr/clean-report`, {
            method: "POST",
            body: mlFormData,
        });

        if (!mlRes.ok) {
            const err = await mlRes.text();
            console.error("ML OCR error:", err);
            return NextResponse.json(
                { error: "OCR processing failed" },
                { status: 500 }
            );
        }

        const result = await mlRes.json();

        // Normalize structured_data so medications are always in the format
        // the frontend expects: { drug_name, dosage, frequency, ... }
        if (result.structured_data) {
            const sd = result.structured_data;

            // If the Groq LLM returned a "general" doc shape with key_information.medications
            // as a flat string array, convert them into structured medication objects
            if (!sd.medications && sd.key_information?.medications) {
                sd.medications = sd.key_information.medications.map((m: string) => ({
                    drug_name: m,
                    dosage: "",
                    frequency: "",
                    duration: "",
                    instructions: "",
                }));
            }

            // For discharge summaries, medications_at_discharge → medications
            if (!sd.medications && sd.medications_at_discharge) {
                sd.medications = sd.medications_at_discharge;
            }
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error("OCR route error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
