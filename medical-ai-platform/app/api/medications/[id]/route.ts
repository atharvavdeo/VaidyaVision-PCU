import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { medications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";

/**
 * PATCH /api/medications/[id] — Update a medication
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const medId = parseInt(id);
        const body = await req.json();

        const existingMed = await db.query.medications.findFirst({
            where: eq(medications.id, medId),
        });
        if (!existingMed) return NextResponse.json({ error: "Medication not found" }, { status: 404 });
        if (user.role === "patient" && existingMed.patientId !== user.id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const updateData: Record<string, unknown> = {};
        const fields = ["drugName", "dosage", "form", "frequency", "timeOfDay", "duration", "startDate", "endDate", "instructions", "isActive"];
        for (const field of fields) {
            if (body[field] !== undefined) {
                if (field === "timeOfDay" && Array.isArray(body[field])) {
                    updateData[field] = JSON.stringify(body[field]);
                } else {
                    updateData[field] = body[field];
                }
            }
        }
        updateData.updatedAt = new Date();

        await db.update(medications).set(updateData).where(eq(medications.id, medId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Medications PATCH error:", error);
        return NextResponse.json({ error: "Failed to update medication" }, { status: 500 });
    }
}

/**
 * DELETE /api/medications/[id] — Delete a medication
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { id } = await params;
        const medId = parseInt(id);

        const existingMed = await db.query.medications.findFirst({
            where: eq(medications.id, medId),
        });
        if (!existingMed) return NextResponse.json({ error: "Medication not found" }, { status: 404 });
        if (user.role === "patient" && existingMed.patientId !== user.id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        await db.delete(medications).where(eq(medications.id, medId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Medications DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete medication" }, { status: 500 });
    }
}
