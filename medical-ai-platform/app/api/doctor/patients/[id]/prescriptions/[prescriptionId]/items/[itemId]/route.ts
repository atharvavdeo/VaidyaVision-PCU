import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doctorPrescriptionItems, doctorPrescriptions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; prescriptionId: string; itemId: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (user.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        const { id, prescriptionId, itemId } = await params;
        const patientId = Number.parseInt(id, 10);
        const parsedPrescriptionId = Number.parseInt(prescriptionId, 10);
        const parsedItemId = Number.parseInt(itemId, 10);

        if (Number.isNaN(patientId) || Number.isNaN(parsedPrescriptionId) || Number.isNaN(parsedItemId)) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        const prescription = await db.query.doctorPrescriptions.findFirst({
            where: eq(doctorPrescriptions.id, parsedPrescriptionId),
        });

        if (!prescription || prescription.patientId !== patientId) {
            return NextResponse.json({ error: "Prescription not found" }, { status: 404 });
        }

        if (prescription.doctorId !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const item = await db.query.doctorPrescriptionItems.findFirst({
            where: and(
                eq(doctorPrescriptionItems.id, parsedItemId),
                eq(doctorPrescriptionItems.doctorPrescriptionId, parsedPrescriptionId)
            ),
        });

        if (!item) {
            return NextResponse.json({ error: "Prescription item not found" }, { status: 404 });
        }

        const body = (await req.json()) as { isActive?: boolean };
        if (typeof body.isActive !== "boolean") {
            return NextResponse.json({ error: "isActive boolean is required" }, { status: 400 });
        }

        const now = new Date();

        const [updatedItem] = await db.update(doctorPrescriptionItems)
            .set({
                isActive: body.isActive,
                updatedAt: now,
            })
            .where(eq(doctorPrescriptionItems.id, parsedItemId))
            .returning();

        await db.update(doctorPrescriptions)
            .set({ updatedAt: now })
            .where(eq(doctorPrescriptions.id, parsedPrescriptionId));

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error("[PATCH /api/doctor/patients/[id]/prescriptions/[prescriptionId]/items/[itemId]]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
