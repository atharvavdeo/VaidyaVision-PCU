import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, patientHospitalLinks, hospitals } from "@/lib/db/schema";
import { eq, and, or, ilike, like } from "drizzle-orm";
import { getAuthUser, unauthorized, forbidden, resolveHospital } from "@/lib/api-auth";

// GET /api/hospitals/[id]/patients?query= — search patients linked to hospital
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        if (!["doctor", "pathologist", "hospital_admin"].includes(user.role)) {
            return forbidden("Clinician access only");
        }

        const hospitalId = parseInt(params.id);
        if (isNaN(hospitalId)) {
            return NextResponse.json({ error: "Invalid hospital id" }, { status: 400 });
        }

        // Verify caller is a member of this hospital
        const resolution = await resolveHospital(user.id, hospitalId);
        if (!resolution.ok) {
            return forbidden("You are not a member of this hospital");
        }

        const query = req.nextUrl.searchParams.get("query") ?? "";

        // Get all patient links for this hospital, optionally filter by name/email
        const links = await db.query.patientHospitalLinks.findMany({
            where: eq(patientHospitalLinks.hospitalId, hospitalId),
            with: {
                patient: true,
            },
        });

        // Filter by query (name or email, case-insensitive)
        const filtered = query
            ? links.filter(
                (l) =>
                    l.patient.name.toLowerCase().includes(query.toLowerCase()) ||
                    l.patient.email.toLowerCase().includes(query.toLowerCase()) ||
                    (l.mrn && l.mrn.toLowerCase().includes(query.toLowerCase()))
            )
            : links;

        const result = filtered.map((l) => ({
            id: l.patient.id,
            name: l.patient.name,
            email: l.patient.email,
            mrn: l.mrn,
            patientHospitalLinkId: l.id,
            status: l.status,
        }));

        return NextResponse.json({ patients: result });
    } catch (error) {
        console.error("[GET /api/hospitals/[id]/patients]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
