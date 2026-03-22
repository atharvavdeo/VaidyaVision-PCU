import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { medicationLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";

/**
 * POST /api/medications/log — Log a medication as taken/missed/skipped
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { medicationId, status, scheduledTime, notes } = await req.json();

        if (!medicationId || !status) {
            return NextResponse.json({ error: "medicationId and status required" }, { status: 400 });
        }

        const logDate = new Date().toISOString().split("T")[0];

        // Check if already logged for this time slot today
        const existing = await db.query.medicationLogs.findFirst({
            where: and(
                eq(medicationLogs.medicationId, medicationId),
                eq(medicationLogs.logDate, logDate),
                eq(medicationLogs.scheduledTime, scheduledTime || ""),
            ),
        });

        if (existing) {
            // Update existing log
            await db.update(medicationLogs)
                .set({ status, takenAt: status === "taken" ? new Date() : null, notes })
                .where(eq(medicationLogs.id, existing.id));
            return NextResponse.json({ success: true, updated: true });
        }

        const [log] = await db.insert(medicationLogs).values({
            medicationId,
            patientId: user.id,
            status,
            scheduledTime: scheduledTime || null,
            takenAt: status === "taken" ? new Date() : null,
            notes: notes || null,
            logDate,
        }).returning();

        return NextResponse.json({ success: true, log });
    } catch (error) {
        console.error("Medication log error:", error);
        return NextResponse.json({ error: "Failed to log medication" }, { status: 500 });
    }
}
