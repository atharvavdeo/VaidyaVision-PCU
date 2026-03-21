
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { voiceNotes, scans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const { scanId, transcription } = await req.json();

        if (!scanId || !transcription) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const scan = await db.query.scans.findFirst({
            where: eq(scans.id, scanId),
        });

        if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

        await db.insert(voiceNotes).values({
            scanId,
            transcription,
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[POST /api/voice-notes] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
