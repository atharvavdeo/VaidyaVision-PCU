import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doctorPrescriptionItems, doctorPrescriptions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";

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

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; prescriptionId: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (user.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        const { id, prescriptionId } = await params;
        const patientId = Number.parseInt(id, 10);
        const parsedPrescriptionId = Number.parseInt(prescriptionId, 10);
        if (Number.isNaN(patientId) || Number.isNaN(parsedPrescriptionId)) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        const existing = await db.query.doctorPrescriptions.findFirst({
            where: eq(doctorPrescriptions.id, parsedPrescriptionId),
        });

        if (!existing || existing.patientId !== patientId) {
            return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
        }

        if (existing.doctorId !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const payload = (await req.json()) as InputPayload;

        const updates: Partial<typeof doctorPrescriptions.$inferInsert> = {
            updatedAt: new Date(),
        };

        if (typeof payload.title === "string") {
            const title = payload.title.trim();
            if (!title) {
                return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
            }
            updates.title = title;
        }

        if (typeof payload.notes === "string") {
            updates.notes = payload.notes.trim() || null;
        }

        await db.update(doctorPrescriptions)
            .set(updates)
            .where(and(eq(doctorPrescriptions.id, parsedPrescriptionId), eq(doctorPrescriptions.doctorId, user.id)));

        if (Array.isArray(payload.items)) {
            const invalidItem = payload.items.find((item) => !item.medicineName || !item.medicineName.trim());
            if (invalidItem) {
                return NextResponse.json({ error: "Each medicine item requires medicineName" }, { status: 400 });
            }

            await db.delete(doctorPrescriptionItems)
                .where(eq(doctorPrescriptionItems.doctorPrescriptionId, parsedPrescriptionId));

            if (payload.items.length > 0) {
                await db.insert(doctorPrescriptionItems).values(
                    payload.items.map((item) => ({
                        doctorPrescriptionId: parsedPrescriptionId,
                        medicineName: item.medicineName.trim(),
                        dosage: item.dosage?.trim() || null,
                        frequency: item.frequency?.trim() || null,
                        duration: item.duration?.trim() || null,
                        directions: item.directions?.trim() || null,
                    }))
                );
            }
        }

        const updated = await db.query.doctorPrescriptions.findFirst({
            where: eq(doctorPrescriptions.id, parsedPrescriptionId),
            with: { items: true },
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[PATCH /api/doctor/patients/[id]/prescriptions/[prescriptionId]]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
