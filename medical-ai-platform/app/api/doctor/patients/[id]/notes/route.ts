import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientNotes, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";
import { canDoctorAccessPatient } from "@/lib/doctor-patient-access";

const ALLOWED_LINK_TYPES = new Set(["scan", "report", "appointment"]);

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (user.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        const { id } = await params;
        const patientId = Number.parseInt(id, 10);
        if (Number.isNaN(patientId)) {
            return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
        }

        const patient = await db.query.users.findFirst({
            where: eq(users.id, patientId),
            columns: { id: true, role: true },
        });
        if (!patient || patient.role !== "patient") {
            return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }

        const canAccess = await canDoctorAccessPatient(user.id, patientId);
        if (!canAccess) {
            return NextResponse.json({ error: "You do not have access to this patient." }, { status: 403 });
        }

        const body = (await req.json()) as {
            content?: string;
            linkedToType?: string;
            linkedToId?: number;
        };

        const content = body.content?.trim();
        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        if (body.linkedToType && !ALLOWED_LINK_TYPES.has(body.linkedToType)) {
            return NextResponse.json({ error: "Invalid linkedToType" }, { status: 400 });
        }

        const [created] = await db.insert(patientNotes).values({
            patientId,
            doctorId: user.id,
            content,
            linkedToType: body.linkedToType ?? null,
            linkedToId: body.linkedToId ?? null,
        }).returning();

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error("[POST /api/doctor/patients/[id]/notes]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
