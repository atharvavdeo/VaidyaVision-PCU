import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { prescriptions, medications } from "@/lib/db/schema";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAuthUser } from "@/lib/api-auth";

/**
 * POST /api/ocr/save — Save an OCR-processed prescription to the database.
 * Receives the original file and ocrResult JSON to store.
 * Auto-extracts medications and creates individual medication records.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const ocrResultStr = formData.get("ocrResult") as string;
        const doctorIdStr = formData.get("doctorId") as string;

        if (!file || !ocrResultStr) {
            return NextResponse.json(
                { error: "Missing file or OCR result" },
                { status: 400 }
            );
        }

        const ocrResult = JSON.parse(ocrResultStr);

        // Save the document image to public/uploads/prescriptions/
        const uploadsDir = path.join(
            process.cwd(),
            "public",
            "uploads",
            "prescriptions"
        );
        await mkdir(uploadsDir, { recursive: true });

        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${randomUUID()}.${ext}`;
        const filePath = path.join(uploadsDir, filename);

        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        const imageUrl = `/uploads/prescriptions/${filename}`;

        // Extract structured info
        const structured = ocrResult.structured_data || {};

        // Determine patientId — doctors can upload for patients
        const patientId = user.role === "doctor" && formData.get("patientId")
            ? parseInt(formData.get("patientId") as string)
            : user.id;

        // Insert into prescriptions table
        const [prescription] = await db
            .insert(prescriptions)
            .values({
                patientId,
                imageUrl,
                documentType: ocrResult.document_type || "medical_document",
                ocrConfidence: ocrResult.confidence || null,
                ocrMethod: ocrResult.method_used || null,
                rawText: ocrResult.raw_text || null,
                cleanedText: ocrResult.cleaned_text || null,
                structuredData: JSON.stringify(structured),
                prescribingDoctor: structured.doctor_name || null,
                prescriptionDate: structured.date || null,
            })
            .returning();

        // Auto-extract medications from structured data
        let medsCreated = 0;
        if (structured.medications && Array.isArray(structured.medications)) {
            for (const med of structured.medications) {
                // Parse frequency into timeOfDay array
                const timeOfDay = parseFrequencyToTimes(med.frequency || "");

                await db.insert(medications).values({
                    patientId,
                    prescriptionId: prescription.id,
                    doctorId: user.role === "doctor" ? user.id : (doctorIdStr ? parseInt(doctorIdStr) : null),
                    drugName: med.drug_name || med.name || "Unknown",
                    dosage: med.dosage || null,
                    form: med.form || null,
                    frequency: med.frequency || null,
                    timeOfDay: JSON.stringify(timeOfDay),
                    duration: med.duration || null,
                    startDate: new Date().toISOString().split("T")[0],
                    instructions: med.instructions || null,
                    addedBy: "ocr",
                });
                medsCreated++;
            }
        }

        return NextResponse.json({
            success: true,
            prescriptionId: prescription.id,
            medicationsCreated: medsCreated,
        });
    } catch (error) {
        console.error("OCR save error:", error);
        return NextResponse.json(
            { error: "Failed to save prescription" },
            { status: 500 }
        );
    }
}

/**
 * Parse frequency text like "twice daily", "3 times a day", "once daily" 
 * into time-of-day slots: ["morning", "evening"], ["morning", "afternoon", "evening"], etc.
 */
function parseFrequencyToTimes(frequency: string): string[] {
    const f = frequency.toLowerCase();
    if (f.includes("thrice") || f.includes("3 times") || f.includes("three times") || f.includes("tid") || f.includes("tds")) {
        return ["morning", "afternoon", "evening"];
    }
    if (f.includes("twice") || f.includes("2 times") || f.includes("two times") || f.includes("bid") || f.includes("bd")) {
        return ["morning", "evening"];
    }
    if (f.includes("four") || f.includes("4 times") || f.includes("qid")) {
        return ["morning", "afternoon", "evening", "night"];
    }
    if (f.includes("morning")) return ["morning"];
    if (f.includes("evening") || f.includes("night") || f.includes("bedtime") || f.includes("hs")) return ["evening"];
    if (f.includes("once") || f.includes("daily") || f.includes("od")) return ["morning"];
    return ["morning"];
}
