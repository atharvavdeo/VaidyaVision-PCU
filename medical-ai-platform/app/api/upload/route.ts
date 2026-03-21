import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { scans, users, notifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// POST /api/upload — Upload a medical scan image and run ML inference
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
        const modality = formData.get("modality") as string;
        const symptoms = formData.get("symptoms") as string | null;
        const patientIdParam = formData.get("patientId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (!modality || !["brain", "lung", "skin", "ecg"].includes(modality)) {
            return NextResponse.json({ error: "Invalid modality" }, { status: 400 });
        }

        // Determine the patient ID: if doctor uploads for a patient, use patientId from form
        let targetPatientId = user.id;
        if (patientIdParam && user.role === "doctor") {
            const patient = await db.query.users.findFirst({
                where: eq(users.id, parseInt(patientIdParam)),
            });
            if (!patient || patient.role !== "patient") {
                return NextResponse.json({ error: "Patient not found" }, { status: 404 });
            }
            targetPatientId = patient.id;
        }

        // Save file to public/uploads/
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });

        const ext = file.name.split(".").pop() || "jpg";
        const filename = `${randomUUID()}.${ext}`;
        const filePath = path.join(uploadsDir, filename);

        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        // Create scan record in DB (status: processing)
        const [scan] = await db
            .insert(scans)
            .values({
                patientId: targetPatientId,
                imageUrl: `/uploads/${filename}`,
                modality: modality as "brain" | "lung" | "skin" | "ecg",
                status: "processing",
                symptoms: symptoms || null,
                originalFilename: file.name,
            })
            .returning();

        // Call ML Service for real inference
        try {
            const mlFormData = new FormData();
            const blob = new Blob([bytes], { type: file.type });
            mlFormData.append("file", blob, filename);
            mlFormData.append("modality", modality);

            const mlRes = await fetch(`${ML_SERVICE_URL}/predict`, {
                method: "POST",
                body: mlFormData,
            });

            if (mlRes.ok) {
                const mlData = await mlRes.json();

                const updateData: Record<string, any> = {
                    status: mlData.status === "REJECTED" ? "pending" : "completed",
                    aiDiagnosis: mlData.diagnosis || mlData.reason || "Analysis Complete",
                    aiConfidence: mlData.confidence ?? null,
                    aiUncertainty: mlData.uncertainty ?? null,
                    heatmapUrl: mlData.heatmap_url || null,
                    expertUsed: mlData.modality || modality,
                    triageScore: mlData.triage_score ?? null,
                };

                // Set priority based on triage score
                if (mlData.triage_score) {
                    if (mlData.triage_score >= 80) updateData.priority = "critical";
                    else if (mlData.triage_score >= 60) updateData.priority = "high";
                    else if (mlData.triage_score >= 40) updateData.priority = "medium";
                    else updateData.priority = "low";
                }

                await db.update(scans).set(updateData).where(eq(scans.id, scan.id));

                // Create notification for the patient
                try {
                    await db.insert(notifications).values({
                        userId: targetPatientId,
                        type: "scan_completed",
                        message: `Your ${modality} scan analysis is complete: ${mlData.diagnosis || "Review needed"}`,
                        link: `/patient/scans/${scan.id}`,
                    });
                    // Also notify all doctors about new scan needing review
                    const doctors = await db.query.users.findMany({
                        where: eq(users.role, "doctor"),
                    });
                    for (const doc of doctors) {
                        await db.insert(notifications).values({
                            userId: doc.id,
                            type: "scan_ready",
                            message: `New ${modality} scan uploaded and analyzed. Priority: ${updateData.priority || "medium"}`,
                            link: `/doctor/scan/${scan.id}`,
                        });
                    }
                } catch (notifErr) {
                    console.error("Notification insert error (non-fatal):", notifErr);
                }

                return NextResponse.json({
                    scanId: scan.id,
                    imageUrl: scan.imageUrl,
                    aiDiagnosis: mlData.diagnosis,
                    confidence: mlData.confidence,
                    heatmapUrl: mlData.heatmap_url,
                    status: mlData.status,
                });
            } else {
                console.error("ML Service failed:", await mlRes.text());
                await db.update(scans).set({ status: "pending" }).where(eq(scans.id, scan.id));
            }
        } catch (mlError) {
            console.error("ML Service Connection Error:", mlError);
            await db.update(scans).set({ status: "pending" }).where(eq(scans.id, scan.id));
        }

        return NextResponse.json({ scanId: scan.id, imageUrl: scan.imageUrl });
    } catch (error) {
        console.error("[/api/upload] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
