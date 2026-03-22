import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientFiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";
import { canDoctorAccessPatient } from "@/lib/doctor-patient-access";
import { persistUploadedFile } from "@/lib/upload";

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

        const formData = await req.formData();
        const file = formData.get("file");
        const linkedToType = formData.get("linkedToType")?.toString();
        const linkedToIdParam = formData.get("linkedToId")?.toString();

        if (!(file instanceof File)) {
            return NextResponse.json({ error: "File is required" }, { status: 400 });
        }

        if (linkedToType && !ALLOWED_LINK_TYPES.has(linkedToType)) {
            return NextResponse.json({ error: "Invalid linkedToType" }, { status: 400 });
        }

        const linkedToId = linkedToIdParam ? Number.parseInt(linkedToIdParam, 10) : null;
        if (linkedToIdParam && Number.isNaN(linkedToId)) {
            return NextResponse.json({ error: "Invalid linkedToId" }, { status: 400 });
        }

        const persisted = await persistUploadedFile(file, "uploads");

        const [created] = await db.insert(patientFiles).values({
            patientId,
            doctorId: user.id,
            fileName: persisted.originalName,
            fileUrl: persisted.relativeUrl,
            fileType: persisted.mimeType,
            fileSize: persisted.size,
            linkedToType: linkedToType ?? null,
            linkedToId,
        }).returning();

        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error("[POST /api/doctor/patients/[id]/files]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
