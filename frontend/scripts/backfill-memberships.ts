import { db } from "../lib/db";
import { users, doctorProfiles, hospitalMemberships, hospitals, specialties } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Backfill memberships for existing doctors.
 * - Assigns each doctor to the first hospital (KEM Mumbai) as primary
 * - Maps legacy specialty string → specialty_id where possible
 * - Idempotent: skips if membership already exists
 */
async function main() {
    console.log("👨‍⚕️ Backfilling doctor memberships...");

    // Get the primary demo hospital (KEM — first seeded)
    const primaryHospital = await db.query.hospitals.findFirst({
        where: eq(hospitals.code, "KEM"),
    });

    if (!primaryHospital) {
        console.error("❌ No hospitals found. Run seed-hospitals-mumbai.ts first.");
        process.exit(1);
    }

    // Load all specialties for mapping
    const allSpecialties = await db.select().from(specialties);
    const specMap = new Map<string, number>();
    for (const s of allSpecialties) {
        specMap.set(s.name.toLowerCase(), s.id);
        specMap.set(s.code.toLowerCase(), s.id);
    }

    // Find legacy specialty → specialty_id
    function resolveSpecialtyId(legacySpecialty: string | null): number | undefined {
        if (!legacySpecialty) return specMap.get("general medicine");

        const lower = legacySpecialty.toLowerCase();

        // Direct match
        if (specMap.has(lower)) return specMap.get(lower);

        // Partial match
        for (const [key, id] of Array.from(specMap.entries())) {
            if (lower.includes(key) || key.includes(lower)) return id;
        }

        // Default to General Medicine
        return specMap.get("general medicine");
    }

    // Get all doctors
    const doctors = await db.select().from(users).where(eq(users.role, "doctor"));

    let inserted = 0;
    let skipped = 0;

    for (const doctor of doctors) {
        // Check if membership already exists
        const existing = await db.query.hospitalMemberships.findFirst({
            where: and(
                eq(hospitalMemberships.userId, doctor.id),
                eq(hospitalMemberships.hospitalId, primaryHospital.id),
                eq(hospitalMemberships.membershipRole, "doctor"),
            ),
        });

        if (existing) {
            skipped++;
            continue;
        }

        // Get doctor profile for specialty mapping
        const profile = await db.query.doctorProfiles.findFirst({
            where: eq(doctorProfiles.userId, doctor.id),
        });

        const legacySpecialty = profile?.specialty || doctor.specialty;
        const specialtyId = resolveSpecialtyId(legacySpecialty);

        // Create membership
        await db.insert(hospitalMemberships).values({
            userId: doctor.id,
            hospitalId: primaryHospital.id,
            specialtyId: specialtyId,
            membershipRole: "doctor",
            title: profile ? `Dr. ${doctor.name}` : undefined,
            licenseNumber: profile?.licenseNumber || undefined,
            status: "active",
            isPrimary: true,
        });

        // Also update the bridge column on doctor_profiles if we resolved a specialtyId
        if (profile && specialtyId) {
            await db.update(doctorProfiles)
                .set({ specialtyId })
                .where(eq(doctorProfiles.id, profile.id));
        }

        // Update bridge column on users
        await db.update(users)
            .set({ hospitalId: primaryHospital.id })
            .where(eq(users.id, doctor.id));

        inserted++;
        console.log(`  ✓ Dr. ${doctor.name} → ${primaryHospital.name} (specialty: ${legacySpecialty || "General Medicine"})`);
    }

    console.log(`\n✅ Membership backfill complete: ${inserted} created, ${skipped} skipped (already exist)`);
    console.log(`   Primary hospital: ${primaryHospital.name} [${primaryHospital.code}]`);
}

main().catch((err) => { console.error(err); process.exit(1); });
