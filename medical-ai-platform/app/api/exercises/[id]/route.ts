import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, exerciseRoutines } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * PATCH /api/exercises/[id] — Update an exercise routine
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { id } = await params;
        const routineId = parseInt(id);
        const body = await req.json();

        const updateData: Record<string, unknown> = {};
        const fields = ["name", "type", "description", "frequency", "durationMinutes", "timeOfDay", "daysOfWeek", "sets", "reps", "isActive"];
        for (const field of fields) {
            if (body[field] !== undefined) {
                if (field === "daysOfWeek" && Array.isArray(body[field])) {
                    updateData[field] = JSON.stringify(body[field]);
                } else {
                    updateData[field] = body[field];
                }
            }
        }

        await db.update(exerciseRoutines).set(updateData).where(eq(exerciseRoutines.id, routineId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Exercises PATCH error:", error);
        return NextResponse.json({ error: "Failed to update exercise" }, { status: 500 });
    }
}

/**
 * DELETE /api/exercises/[id] — Delete an exercise routine
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { id } = await params;
        const routineId = parseInt(id);

        await db.delete(exerciseRoutines).where(eq(exerciseRoutines.id, routineId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Exercises DELETE error:", error);
        return NextResponse.json({ error: "Failed to delete exercise" }, { status: 500 });
    }
}
