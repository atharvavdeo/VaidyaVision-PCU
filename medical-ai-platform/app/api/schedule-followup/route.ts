
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { followUps, users, scans } from "@/lib/db/schema";
import { eq, sql, lt, and } from "drizzle-orm";

// 1. POST: Schedule a follow-up
export async function POST(req: Request) {
    try {
        const { scanId, days, type = "email" } = await req.json();

        if (!scanId || !days) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const scan = await db.query.scans.findFirst({
            where: eq(scans.id, scanId),
        });

        if (!scan) return NextResponse.json({ error: "Scan not found" }, { status: 404 });

        const followUpDate = Math.floor(Date.now() / 1000) + (days * 86400); // Unix timestamp

        await db.insert(followUps).values({
            scanId,
            patientId: scan.patientId,
            scheduledFor: followUpDate,
            type,
            status: "pending",
        });

        return NextResponse.json({ scheduled: true, date: followUpDate });

    } catch (error) {
        console.error("[POST /api/schedule-followup] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// 2. GET: Trigger the "Cron Job" manually to process due items
// In production, hit this endpoint with a secure cron service (e.g. Vercel Cron)
export async function GET(req: Request) {
    try {
        const now = Math.floor(Date.now() / 1000);

        // Find pending follow-ups that are due
        // Note: In a real app with many records, paginate this
        const dueFollowUps = await db.select().from(followUps)
            .where(and(
                lt(followUps.scheduledFor, now),
                eq(followUps.status, "pending")
            ));

        const processed = [];

        for (const f of dueFollowUps) {
            // Process based on type
            if (f.type === "email") {
                // Call our email helper
                // We'll use the internal URL or just import the logic if possible
                // For simplicity, we'll assume we hit the API route
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

                try {
                    await fetch(`${baseUrl}/api/send-report-email`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ scanId: f.scanId }),
                    });

                    // Mark as sent
                    await db.update(followUps)
                        .set({ status: "sent" })
                        .where(eq(followUps.id, f.id));

                    processed.push(f.id);
                } catch (e) {
                    console.error(`Failed to enable follow-up ${f.id}`, e);
                    await db.update(followUps)
                        .set({ status: "failed" })
                        .where(eq(followUps.id, f.id));
                }
            }
        }

        return NextResponse.json({ processedCount: processed.length, processedIds: processed });

    } catch (error) {
        console.error("[GET /api/schedule-followup] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
