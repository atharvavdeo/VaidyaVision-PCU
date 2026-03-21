import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { scans, users } from "@/lib/db/schema";
import { eq, and, count, gte, desc } from "drizzle-orm";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Unauthorized - Doctor only" }, { status: 403 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Parallel queries for dashboard stats
        const [pendingResult, criticalResult, reviewedTodayResult] = await Promise.all([
            db.select({ count: count() })
                .from(scans)
                .where(eq(scans.status, "pending")),

            db.select({ count: count() })
                .from(scans)
                .where(eq(scans.priority, "critical")), // Note: this requires priority column

            db.select({ count: count() })
                .from(scans)
                .where(and(
                    eq(scans.status, "completed"),
                    gte(scans.reviewedAt, today)
                ))
        ]);

        // Fetch full pending list for the queue component (limit 10 for dashboard)
        const pendingScans = await db.query.scans.findMany({
            where: eq(scans.status, "pending"),
            orderBy: [desc(scans.uploadedAt)],
            limit: 10,
            with: {
                patient: true
            }
        });

        // Fetch high risk scans (critical priority)
        const highRiskScans = await db.query.scans.findMany({
            where: eq(scans.priority, "critical"),
            orderBy: [desc(scans.uploadedAt)],
            limit: 5,
            with: {
                patient: true
            }
        });

        return NextResponse.json({
            pending: pendingResult[0].count,
            critical: criticalResult[0].count,
            reviewedToday: reviewedTodayResult[0].count,
            // Mock avg time for now, or calculate if we have created_at vs reviewed_at
            avgTime: 4.2,
            pendingScans,
            highRiskScans
        });

    } catch (error) {
        console.error("[/api/doctor/stats] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
