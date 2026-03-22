import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientNotes } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; noteId: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (user.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        const { id, noteId } = await params;
        const patientId = Number.parseInt(id, 10);
        const parsedNoteId = Number.parseInt(noteId, 10);
        if (Number.isNaN(patientId) || Number.isNaN(parsedNoteId)) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        const note = await db.query.patientNotes.findFirst({
            where: eq(patientNotes.id, parsedNoteId),
        });

        if (!note || note.patientId !== patientId) {
            return NextResponse.json({ error: "Note not found" }, { status: 404 });
        }

        if (note.doctorId !== user.id) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = (await req.json()) as { content?: string };
        const content = body.content?.trim();
        if (!content) {
            return NextResponse.json({ error: "Content is required" }, { status: 400 });
        }

        const [updated] = await db.update(patientNotes)
            .set({
                content,
                updatedAt: new Date(),
            })
            .where(and(eq(patientNotes.id, parsedNoteId), eq(patientNotes.doctorId, user.id)))
            .returning();

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[PATCH /api/doctor/patients/[id]/notes/[noteId]]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
