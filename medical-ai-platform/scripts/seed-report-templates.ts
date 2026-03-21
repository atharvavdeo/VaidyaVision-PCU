import { db } from "../lib/db";
import {
    hospitals, users, hospitalReportTemplates, reports, scans, appointments
} from "../lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const SLOT_CONFIG = JSON.stringify({
    slot1_header: { show: true, label: "Hospital Branding" },
    slot2_patient: { show: true, label: "Patient Information" },
    slot3_doctor: { show: true, label: "Reporting Physician" },
    slot4_case: { show: true, label: "Diagnosis & Findings" },
    slot5_history: { show: true, label: "Patient History Timeline" },
});

const SIGNATURE_CONFIG = JSON.stringify({
    showDoctorSignature: true,
    showHospitalStamp: true,
    signatureLabel: "Authorized Signatory",
});

const DISCLAIMER = `This report has been generated using AI-assisted diagnostic tools and reviewed by a qualified medical professional. The findings herein are based on the clinical data and imaging provided at the time of examination. This report does not constitute a final diagnosis and should be correlated with clinical findings. Patient confidentiality is maintained as per applicable regulations.`;

async function main() {
    console.log("🏥 Seeding hospital report templates & demo history...\n");

    // ── Step 1: Ensure at least one hospital exists with branding ──
    let demoHospitals = await db.query.hospitals.findMany({ limit: 10 });

    if (demoHospitals.length === 0) {
        console.log("  No hospitals found. Creating demo hospital...");
        const [h] = await db.insert(hospitals).values({
            code: "KEM",
            slug: "kem-mumbai",
            name: "KEM Hospital",
            type: "hospital",
            addressLine1: "Acharya Donde Marg, Parel",
            locality: "Parel",
            city: "Mumbai",
            state: "Maharashtra",
            pincode: "400012",
            country: "India",
            phone: "+91-22-24107000",
            email: "info@kemhospital.org",
            website: "https://kemhospital.org",
            logoUrl: "/branding/kem-logo.png",
            reportHeaderUrl: "/branding/kem-header.png",
            reportFooterUrl: "/branding/kem-footer.png",
            isActive: true,
        }).returning();
        demoHospitals = [h];
        console.log(`  ✓ Created demo hospital: ${h.name}`);
    } else {
        // Update the first hospital with branding data
        const primary = demoHospitals[0];
        await db.update(hospitals).set({
            logoUrl: "/branding/kem-logo.png",
            reportHeaderUrl: "/branding/kem-header.png",
            reportFooterUrl: "/branding/kem-footer.png",
            email: primary.email || "info@kemhospital.org",
            website: primary.website || "https://kemhospital.org",
        }).where(eq(hospitals.id, primary.id));
        console.log(`  ✓ Updated branding for: ${primary.name}`);
    }

    const primaryHospitalId = demoHospitals[0].id;

    // ── Step 2: Link all doctors to the primary hospital ──
    const doctorUsers = await db.query.users.findMany({
        where: eq(users.role, "doctor"),
    });

    for (const doc of doctorUsers) {
        if (!doc.hospitalId) {
            await db.update(users).set({ hospitalId: primaryHospitalId })
                .where(eq(users.id, doc.id));
            console.log(`  ✓ Linked Dr. ${doc.name} → hospital #${primaryHospitalId}`);
        }
    }

    // ── Step 3: Seed 1 default hospitalReportTemplates per hospital (up to 10) ──
    for (const hosp of demoHospitals) {
        const existing = await db.query.hospitalReportTemplates.findFirst({
            where: and(
                eq(hospitalReportTemplates.hospitalId, hosp.id),
                eq(hospitalReportTemplates.isDefault, true),
            ),
        });

        if (!existing) {
            await db.insert(hospitalReportTemplates).values({
                hospitalId: hosp.id,
                name: `${hosp.name} Standard Report`,
                version: 1,
                isDefault: true,
                isActive: true,
                logoUrl: hosp.logoUrl || "/branding/kem-logo.png",
                headerImageUrl: hosp.reportHeaderUrl || null,
                footerImageUrl: hosp.reportFooterUrl || null,
                sectionSchemaJson: SLOT_CONFIG,
                signatureConfigJson: SIGNATURE_CONFIG,
                disclaimerText: DISCLAIMER,
            });
            console.log(`  ✓ Created default template for: ${hosp.name}`);
        } else {
            console.log(`  · Template already exists for: ${hosp.name}`);
        }
    }

    // ── Step 4: Seed historical reports for existing patients ──
    const patientUsers = await db.query.users.findMany({
        where: eq(users.role, "patient"),
    });

    const doctor = doctorUsers[0];
    if (!doctor) {
        console.log("\n⚠️  No doctor found. Skipping historical reports/appointments.");
        return finish();
    }

    const now = Date.now();
    let reportsAdded = 0;
    let appointmentsAdded = 0;

    for (const patient of patientUsers) {
        // Get patient's scans for historical reports
        const patientScans = await db.query.scans.findMany({
            where: eq(scans.patientId, patient.id),
        });

        // Create 1-2 historical reports
        const completedScans = patientScans.filter(s => s.status === "completed");
        for (let i = 0; i < Math.min(2, completedScans.length); i++) {
            const scan = completedScans[i];
            const existingReport = await db.query.reports.findFirst({
                where: and(eq(reports.scanId, scan.id), eq(reports.patientId, patient.id)),
            });

            if (!existingReport) {
                const daysAgo = 30 + Math.floor(Math.random() * 60); // 30-90 days ago
                await db.insert(reports).values({
                    scanId: scan.id,
                    patientId: patient.id,
                    doctorId: doctor.id,
                    diagnosis: scan.aiDiagnosis || "Clinical correlation advised",
                    findings: `Historical ${scan.modality.toUpperCase()} imaging review.\nAI-assisted analysis performed with VaidyaVision expert network.\nFindings documented for longitudinal tracking.`,
                    recommendations: "Continue monitoring. Follow-up imaging in 3 months if clinically indicated.",
                    severity: "moderate",
                    status: "signed",
                    signedAt: new Date(now - daysAgo * 86400000),
                    releasedAt: new Date(now - daysAgo * 86400000 + 3600000), // released 1hr after sign
                    deliveryStatus: "sent",
                    createdAt: new Date(now - daysAgo * 86400000),
                });
                reportsAdded++;
            }
        }

        // Create 2-3 past completed appointments
        const pastSlots = [
            { daysAgo: 35, type: "follow_up" as const, notes: "Routine follow-up — imaging reviewed, stable" },
            { daysAgo: 60, type: "review" as const, notes: "Scan review appointment — discussed findings" },
            { daysAgo: 85, type: "initial" as const, notes: "Initial consultation — history taken, scans ordered" },
        ];

        for (const slot of pastSlots.slice(0, 2 + Math.floor(Math.random() * 2))) {
            const scheduledAt = new Date(now - slot.daysAgo * 86400000);
            const existing = await db.query.appointments.findFirst({
                where: and(
                    eq(appointments.patientId, patient.id),
                    eq(appointments.scheduledAt, scheduledAt),
                ),
            });
            if (!existing) {
                await db.insert(appointments).values({
                    patientId: patient.id,
                    doctorId: doctor.id,
                    scheduledAt,
                    type: slot.type,
                    notes: slot.notes,
                    status: "completed",
                });
                appointmentsAdded++;
            }
        }
    }

    console.log(`  ✓ Added ${reportsAdded} historical reports`);
    console.log(`  ✓ Added ${appointmentsAdded} past appointments`);

    return finish();
}

function finish() {
    console.log("\n✅ Report template seed completed!");
    console.log("   Hospitals branded · Doctors linked · Templates seeded · History populated");
}

main().catch((err) => { console.error(err); process.exit(1); });
