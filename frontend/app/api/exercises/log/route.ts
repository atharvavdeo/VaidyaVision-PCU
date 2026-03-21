import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, exerciseLogs } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/exercises/log — Log an exercise as completed/partial/skipped
 */
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

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
