import { db } from "../lib/db";
import { users, patientHospitalLinks, hospitals, hospitalMemberships } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Backfill patient-hospital links for existing patients.
 * - Links each patient to the primary demo hospital (KEM Mumbai)
 * - Generates MRN per patient-hospital pair
 * - Sets primary doctor membership where a doctor membership exists
 * - Idempotent: skips if link already exists
 */
async function main() {
    console.log("🏥 Backfilling patient-hospital links...");

    // Get the primary hospital
    const primaryHospital = await db.query.hospitals.findFirst({
        where: eq(hospitals.code, "KEM"),
    });

    if (!primaryHospital) {
        console.error("❌ No hospitals found. Run seed-hospitals-mumbai.ts first.");
        process.exit(1);
    }

    // Get first doctor membership at this hospital (for primary doctor assignment)
    const doctorMembership = await db.query.hospitalMemberships.findFirst({
        where: and(
            eq(hospitalMemberships.hospitalId, primaryHospital.id),
            eq(hospitalMemberships.membershipRole, "doctor"),
            eq(hospitalMemberships.status, "active"),
        ),
    });

    // Get all patients
    const patients = await db.select().from(users).where(eq(users.role, "patient"));

    let inserted = 0;
    let skipped = 0;

    for (const patient of patients) {
        // Check if link already exists
        const existing = await db.query.patientHospitalLinks.findFirst({
            where: and(
                eq(patientHospitalLinks.patientId, patient.id),
                eq(patientHospitalLinks.hospitalId, primaryHospital.id),
            ),
        });

        if (existing) {
            skipped++;
            continue;
        }

        // Generate MRN: hospital code + year + zero-padded patient id
        const year = new Date().getFullYear();
        const mrn = `${primaryHospital.code}-${year}-${String(patient.id).padStart(5, "0")}`;

        await db.insert(patientHospitalLinks).values({
            patientId: patient.id,
            hospitalId: primaryHospital.id,
            mrn,
            primaryDoctorMembershipId: doctorMembership?.id || null,
            status: "active",
        });

        inserted++;
        console.log(`  ✓ ${patient.name} → ${primaryHospital.name} (MRN: ${mrn})`);
    }

    console.log(`\n✅ Patient-hospital link backfill complete: ${inserted} created, ${skipped} skipped`);
    console.log(`   Hospital: ${primaryHospital.name} [${primaryHospital.code}]`);
    if (doctorMembership) {
        console.log(`   Primary doctor membership ID: ${doctorMembership.id}`);
    }
}

main().catch((err) => { console.error(err); process.exit(1); });
