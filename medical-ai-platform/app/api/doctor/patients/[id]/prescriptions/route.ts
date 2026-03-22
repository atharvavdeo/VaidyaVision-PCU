import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doctorPrescriptionItems, doctorPrescriptions, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";
import { canDoctorAccessPatient } from "@/lib/doctor-patient-access";

type InputItem = {
    medicineName: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    directions?: string;
};

type InputPayload = {
    title?: string;
    notes?: string;
    items?: InputItem[];
};

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

        const payload = (await req.json()) as InputPayload;
        const title = payload.title?.trim();
        const notes = payload.notes?.trim();
        const items = Array.isArray(payload.items) ? payload.items : [];

        if (!title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const invalidItem = items.find((item) => !item.medicineName || !item.medicineName.trim());
        if (invalidItem) {
            return NextResponse.json({ error: "Each medicine item requires medicineName" }, { status: 400 });
        }

        const [createdPrescription] = await db.insert(doctorPrescriptions).values({
            patientId,
            doctorId: user.id,
            title,
            notes: notes || null,
        }).returning();

        if (items.length > 0) {
            await db.insert(doctorPrescriptionItems).values(
                items.map((item) => ({
                    doctorPrescriptionId: createdPrescription.id,
                    medicineName: item.medicineName.trim(),
                    dosage: item.dosage?.trim() || null,
                    frequency: item.frequency?.trim() || null,
                    duration: item.duration?.trim() || null,
                    directions: item.directions?.trim() || null,
                }))
            );
        }

        const fullPrescription = await db.query.doctorPrescriptions.findFirst({
            where: eq(doctorPrescriptions.id, createdPrescription.id),
            with: { items: true },
        });

        return NextResponse.json(fullPrescription, { status: 201 });
    } catch (error) {
        console.error("[POST /api/doctor/patients/[id]/prescriptions]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
