import { db } from "../lib/db";
import { users, scans, cases, caseArtifacts, hospitals, hospitalMemberships, patientHospitalLinks } from "../lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Backfill cases from legacy scans.
 * - Creates one case per existing scan (that doesn't already have a case_id)
 * - Creates a case_artifact for each scan's image
 * - Updates the scan.case_id and scan.source_artifact_id bridge columns
 * - Idempotent: skips scans that already have a case_id
 */
async function main() {
    console.log("📋 Backfilling cases from legacy scans...");

    // Get primary hospital
    const primaryHospital = await db.query.hospitals.findFirst({
        where: eq(hospitals.code, "KEM"),
    });

    if (!primaryHospital) {
        console.error("❌ No hospitals found. Run seed-hospitals-mumbai.ts first.");
        process.exit(1);
    }

    // Get scans that haven't been backfilled yet (no case_id)
    const allScans = await db.select().from(scans).where(isNull(scans.caseId));

    let casesCreated = 0;
    let artifactsCreated = 0;
    let skippedTotal = 0;

    for (const scan of allScans) {
        // Find doctor's membership at the hospital
        let doctorMembershipId: number | undefined;
        if (scan.doctorId) {
            const membership = await db.query.hospitalMemberships.findFirst({
                where: and(
                    eq(hospitalMemberships.userId, scan.doctorId),
                    eq(hospitalMemberships.hospitalId, primaryHospital.id),
                    eq(hospitalMemberships.membershipRole, "doctor"),
                ),
            });
            doctorMembershipId = membership?.id;
        }

        // Determine who created the scan
        const createdByUserId = scan.doctorId || scan.patientId;
        const sourceRole = scan.doctorId ? "doctor" as const : "patient" as const;

        // Determine creator's membership (if doctor)
        let createdByMembershipId: number | undefined;
        if (scan.doctorId) {
            createdByMembershipId = doctorMembershipId;
        }

        // Create the case
        const [newCase] = await db.insert(cases).values({
            hospitalId: primaryHospital.id,
            patientId: scan.patientId,
            createdByUserId,
            createdByMembershipId: createdByMembershipId || null,
            sourceRole,
            primaryDoctorMembershipId: doctorMembershipId || null,
            title: `${scan.modality.charAt(0).toUpperCase() + scan.modality.slice(1)} Scan`,
            presentingComplaint: scan.symptoms || undefined,
            internalSummary: scan.aiDiagnosis || undefined,
            status: scan.status === "completed" ? "signed" : scan.status === "processing" ? "in_review" : "new",
            priority: "medium",
            patientVisibilityStatus: scan.status === "completed" ? "released" : "hidden",
        }).returning();

        casesCreated++;

        // Create the artifact for the scan image
        const [artifact] = await db.insert(caseArtifacts).values({
            caseId: newCase.id,
            hospitalId: primaryHospital.id,
            patientId: scan.patientId,
            uploadedByUserId: createdByUserId,
            uploadedByMembershipId: createdByMembershipId || null,
            artifactType: "scan_image",
            processingPipeline: "ml_scan",
            fileUrl: scan.imageUrl,
            originalFilename: scan.originalFilename || undefined,
            modalityHint: scan.modality,
            status: scan.status === "completed" ? "processed" : scan.status === "processing" ? "processing" : "uploaded",
            processingResultJson: scan.aiDiagnosis ? JSON.stringify({
                diagnosis: scan.aiDiagnosis,
                confidence: scan.aiConfidence,
                uncertainty: scan.aiUncertainty,
                heatmapUrl: scan.heatmapUrl,
                expertUsed: scan.expertUsed,
            }) : undefined,
            patientVisible: scan.status === "completed",
        }).returning();

        artifactsCreated++;

        // Update bridge columns on the scan
        await db.update(scans).set({
            caseId: newCase.id,
            sourceArtifactId: artifact.id,
            hospitalId: primaryHospital.id,
        }).where(eq(scans.id, scan.id));

        console.log(`  ✓ Scan #${scan.id} (${scan.modality}) → Case #${newCase.id}, Artifact #${artifact.id}`);
    }

    // Count skipped (scans that already had case_id - not in our allScans query)
    const totalScans = await db.select().from(scans);
    skippedTotal = totalScans.length - allScans.length;

    console.log(`\n✅ Case backfill complete: ${casesCreated} cases, ${artifactsCreated} artifacts created, ${skippedTotal} scans skipped (already backfilled)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
