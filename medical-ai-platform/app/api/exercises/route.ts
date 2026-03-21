import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, exerciseRoutines, exerciseLogs } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * GET /api/exercises — List exercise routines for the current user
 * Query: ?patientId=123 (for doctors viewing a patient's routines)
 */
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { searchParams } = new URL(req.url);
        const patientIdParam = searchParams.get("patientId");

        let targetPatientId = user.id;
        if (user.role === "doctor" && patientIdParam) {
            targetPatientId = parseInt(patientIdParam);
        }

        const routines = await db.query.exerciseRoutines.findMany({
            where: eq(exerciseRoutines.patientId, targetPatientId),
            orderBy: [desc(exerciseRoutines.createdAt)],
        });

        // Get today's logs
        const today = new Date().toISOString().split("T")[0];
        const todayLogs = await db.query.exerciseLogs.findMany({
            where: and(
                eq(exerciseLogs.patientId, targetPatientId),
                eq(exerciseLogs.logDate, today),
            ),
        });

        return NextResponse.json({ routines, todayLogs });
    } catch (error) {
        console.error("Exercises GET error:", error);
        return NextResponse.json({ error: "Failed to fetch exercises" }, { status: 500 });
    }
}

/**
 * POST /api/exercises — Add an exercise routine
 */
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const body = await req.json();
        const {
            patientId, name, type, description, frequency,
            durationMinutes, timeOfDay, daysOfWeek, sets, reps,
        } = body;

        const targetPatientId = user.role === "doctor" ? (patientId || user.id) : user.id;
        const addedBy = user.role === "doctor" ? "doctor" : "patient";

        const [routine] = await db.insert(exerciseRoutines).values({
            patientId: targetPatientId,
            doctorId: user.role === "doctor" ? user.id : null,
            name,
            type: type || "other",
            description: description || null,
            frequency: frequency || null,
            durationMinutes: durationMinutes || null,
            timeOfDay: timeOfDay || null,
            daysOfWeek: daysOfWeek ? JSON.stringify(daysOfWeek) : null,
            sets: sets || null,
            reps: reps || null,
            addedBy,
        }).returning();

        return NextResponse.json({ success: true, routine });
    } catch (error) {
        console.error("Exercises POST error:", error);
        return NextResponse.json({ error: "Failed to add exercise" }, { status: 500 });
    }
}
