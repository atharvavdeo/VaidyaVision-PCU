import { db } from "../lib/db";
import { specialties } from "../lib/db/schema";
import { eq } from "drizzle-orm";

const SPECIALTIES = [
    { code: "RAD", name: "Radiology", departmentGroup: "Diagnostics", isDiagnostic: true },
    { code: "PATH", name: "Pathology", departmentGroup: "Diagnostics", isDiagnostic: true },
    { code: "PUL", name: "Pulmonology", departmentGroup: "Medicine", isDiagnostic: false },
    { code: "CARD", name: "Cardiology", departmentGroup: "Medicine", isDiagnostic: false },
    { code: "NEUR", name: "Neurology", departmentGroup: "Medicine", isDiagnostic: false },
    { code: "DERM", name: "Dermatology", departmentGroup: "Medicine", isDiagnostic: false },
    { code: "ONCO", name: "Oncology", departmentGroup: "Medicine", isDiagnostic: false },
    { code: "GENM", name: "General Medicine", departmentGroup: "Medicine", isDiagnostic: false },
    { code: "ORTH", name: "Orthopedics", departmentGroup: "Surgery", isDiagnostic: false },
    { code: "PEDI", name: "Pediatrics", departmentGroup: "Medicine", isDiagnostic: false },
    { code: "GYNE", name: "Gynecology", departmentGroup: "Surgery", isDiagnostic: false },
    { code: "ENT", name: "ENT (Otorhinolaryngology)", departmentGroup: "Surgery", isDiagnostic: false },
    { code: "NEPH", name: "Nephrology", departmentGroup: "Medicine", isDiagnostic: false },
    { code: "GAST", name: "Gastroenterology", departmentGroup: "Medicine", isDiagnostic: false },
    { code: "ENDO", name: "Endocrinology", departmentGroup: "Medicine", isDiagnostic: false },
    { code: "PSYCH", name: "Psychiatry", departmentGroup: "Medicine", isDiagnostic: false },
    { code: "ANES", name: "Anesthesiology", departmentGroup: "Support", isDiagnostic: false },
    { code: "EMRG", name: "Emergency Medicine", departmentGroup: "Medicine", isDiagnostic: false },
    { code: "OPTH", name: "Ophthalmology", departmentGroup: "Surgery", isDiagnostic: false },
    { code: "UROL", name: "Urology", departmentGroup: "Surgery", isDiagnostic: false },
];

async function main() {
    console.log("🔬 Seeding specialties...");

    let inserted = 0;
    let skipped = 0;

    for (const spec of SPECIALTIES) {
        const existing = await db.query.specialties.findFirst({
            where: eq(specialties.code, spec.code),
        });

        if (existing) {
            skipped++;
            continue;
        }

        await db.insert(specialties).values({
            code: spec.code,
            name: spec.name,
            departmentGroup: spec.departmentGroup,
            isDiagnostic: spec.isDiagnostic,
            isActive: true,
        });
        inserted++;
        console.log(`  ✓ ${spec.code} — ${spec.name}`);
    }

    console.log(`\n✅ Specialties seed complete: ${inserted} inserted, ${skipped} skipped (already exist)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
