import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseArtifacts, cases } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getAuthUser, unauthorized, forbidden, badRequest, notFound, resolveHospital } from "@/lib/api-auth";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

/**
 * POST /api/artifacts/upload
 * Case-aware artifact upload. Does NOT create a scan record.
 * Triggers ML or OCR conditionally based on processingPipeline field.
 * DOES NOT modify /api/upload — legacy scan flow is untouched.
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        if (!["doctor", "pathologist", "hospital_admin"].includes(user.role)) {
            return forbidden("Clinician access only");
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const caseIdParam = formData.get("caseId") as string | null;
        const artifactType = formData.get("artifactType") as string || "other";
        const processingPipeline = formData.get("processingPipeline") as string || "none";
        const modalityHint = formData.get("modalityHint") as string | null;

        if (!file) return badRequest("No file provided");
        if (!caseIdParam) return badRequest("caseId required");

        const caseId = parseInt(caseIdParam);
        if (isNaN(caseId)) return badRequest("Invalid caseId");

        // Validate artifact type
        const validArtifactTypes = ["scan_image", "pathology_image", "lab_pdf", "prescription_image", "report_pdf", "other"];
        if (!validArtifactTypes.includes(artifactType)) return badRequest("Invalid artifactType");

        const validPipelines = ["ml_scan", "ocr_doc", "none"];
        if (!validPipelines.includes(processingPipeline)) return badRequest("Invalid processingPipeline");

        // Verify case exists and caller has hospital access
        const case_ = await db.query.cases.findFirst({ where: eq(cases.id, caseId) });
        if (!case_) return notFound("Case not found");

        const resolution = await resolveHospital(user.id, case_.hospitalId);
        if (!resolution.ok) return forbidden("Not a member of this hospital");
        const { membership } = resolution;

        // Save file to disk
        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadsDir, { recursive: true });

        const ext = file.name.split(".").pop() || "bin";
        const filename = `${randomUUID()}.${ext}`;
        const filePath = path.join(uploadsDir, filename);
        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        const fileUrl = `/uploads/${filename}`;

        // Create artifact record at status=uploaded
        const [artifact] = await db.insert(caseArtifacts).values({
            caseId,
            hospitalId: case_.hospitalId,
            patientId: case_.patientId,
            uploadedByUserId: user.id,
            uploadedByMembershipId: membership.id,
            artifactType: artifactType as any,
            processingPipeline: processingPipeline as any,
            fileUrl,
            originalFilename: file.name,
            mimeType: file.type || null,
            sizeBytes: file.size || null,
            modalityHint: modalityHint || null,
            status: "uploaded",
            patientVisible: false,
        }).returning();

        // ── Async pipeline trigger ─────────────────────────────────────────
        // Fire-and-forget — update artifact status after pipeline result

        if (processingPipeline === "ml_scan") {
            // Trigger ML inference in background
            (async () => {
                try {
                    await db.update(caseArtifacts)
                        .set({ status: "processing" })
                        .where(eq(caseArtifacts.id, artifact.id));

                    const mlFormData = new FormData();
                    const blob = new Blob([bytes], { type: file.type });
                    mlFormData.append("file", blob, filename);
                    if (modalityHint) mlFormData.append("modality", modalityHint);

                    const mlRes = await fetch(`${ML_SERVICE_URL}/predict`, {
                        method: "POST",
                        body: mlFormData,
                    });

                    if (mlRes.ok) {
                        const mlData = await mlRes.json();
                        await db.update(caseArtifacts).set({
                            status: "processed",
                            processingResultJson: JSON.stringify(mlData),
                        }).where(eq(caseArtifacts.id, artifact.id));
                    } else {
                        await db.update(caseArtifacts).set({ status: "failed" }).where(eq(caseArtifacts.id, artifact.id));
                    }
                } catch {
                    await db.update(caseArtifacts).set({ status: "failed" }).where(eq(caseArtifacts.id, artifact.id));
                }
            })();
        } else if (processingPipeline === "ocr_doc") {
            (async () => {
                try {
                    await db.update(caseArtifacts)
                        .set({ status: "processing" })
                        .where(eq(caseArtifacts.id, artifact.id));

                    const ocrFormData = new FormData();
                    const blob = new Blob([bytes], { type: file.type });
                    ocrFormData.append("file", blob, filename);

                    const ocrRes = await fetch(`${ML_SERVICE_URL}/ocr`, {
                        method: "POST",
                        body: ocrFormData,
                    });

                    if (ocrRes.ok) {
                        const ocrData = await ocrRes.json();
                        await db.update(caseArtifacts).set({
                            status: "processed",
                            processingResultJson: JSON.stringify(ocrData),
                        }).where(eq(caseArtifacts.id, artifact.id));
                    } else {
                        await db.update(caseArtifacts).set({ status: "failed" }).where(eq(caseArtifacts.id, artifact.id));
                    }
                } catch {
                    await db.update(caseArtifacts).set({ status: "failed" }).where(eq(caseArtifacts.id, artifact.id));
                }
            })();
        }

        return NextResponse.json({
            artifactId: artifact.id,
            fileUrl,
            status: artifact.status,
        }, { status: 201 });

    } catch (error) {
        console.error("[POST /api/artifacts/upload]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
