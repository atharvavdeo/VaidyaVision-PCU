import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { exerciseLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";

/**
 * POST /api/exercises/log — Log an exercise as completed/partial/skipped
 */
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { routineId, status, durationMinutes, notes } = await req.json();

        if (!routineId || !status) {
            return NextResponse.json({ error: "routineId and status required" }, { status: 400 });
        }

        const logDate = new Date().toISOString().split("T")[0];

        // Check if already logged today
        const existing = await db.query.exerciseLogs.findFirst({
            where: and(
                eq(exerciseLogs.routineId, routineId),
                eq(exerciseLogs.logDate, logDate),
            ),
        });

        if (existing) {
            await db.update(exerciseLogs)
                .set({ status, durationMinutes, notes, completedAt: status === "completed" ? new Date() : null })
                .where(eq(exerciseLogs.id, existing.id));
            return NextResponse.json({ success: true, updated: true });
        }

        const [log] = await db.insert(exerciseLogs).values({
            routineId,
            patientId: user.id,
            status,
            durationMinutes: durationMinutes || null,
            notes: notes || null,
            logDate,
            completedAt: status === "completed" ? new Date() : null,
        }).returning();

        return NextResponse.json({ success: true, log });
    } catch (error) {
        console.error("Exercise log error:", error);
        return NextResponse.json({ error: "Failed to log exercise" }, { status: 500 });
    }
}
