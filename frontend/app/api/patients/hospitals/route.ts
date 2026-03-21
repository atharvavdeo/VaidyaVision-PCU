import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientHospitalLinks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser, unauthorized, requireRoles } from "@/lib/api-auth";

// GET /api/patients/hospitals — list hospitals the current patient is linked to
export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        const roleError = requireRoles(user, ["patient"]);
        if (roleError) return roleError;

        const links = await db.query.patientHospitalLinks.findMany({
            where: eq(patientHospitalLinks.patientId, user.id),
            with: {
                hospital: true,
            },
        });

        const result = links.map((l) => ({
            id: l.id,
            hospitalId: l.hospitalId,
            hospital: {
                id: l.hospital.id,
                name: l.hospital.name,
                city: l.hospital.city,
                locality: l.hospital.locality,
                logoUrl: l.hospital.logoUrl,
            },
            mrn: l.mrn,
            status: l.status,
            createdAt: l.createdAt,
        }));

        return NextResponse.json({ links: result });
    } catch (error) {
        console.error("[GET /api/patients/hospitals]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
