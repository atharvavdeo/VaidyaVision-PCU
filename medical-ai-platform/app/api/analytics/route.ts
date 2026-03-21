import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { scans, users, appointments, reports, conversations, messages } from "@/lib/db/schema";
import { eq, count, avg, and, gte, desc, sql } from "drizzle-orm";

// GET /api/analytics — Dashboard analytics (role-aware)
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        if (user.role === "doctor") {
            // Doctor analytics
            const [totalScansResult] = await db
                .select({ count: count() })
                .from(scans);

            const [pendingScansResult] = await db
                .select({ count: count() })
                .from(scans)
                .where(eq(scans.status, "pending"));

            const [completedScansResult] = await db
                .select({ count: count() })
                .from(scans)
                .where(eq(scans.status, "completed"));

            const [totalPatientsResult] = await db
                .select({ count: count() })
                .from(users)
                .where(eq(users.role, "patient"));

            const [totalReportsResult] = await db
                .select({ count: count() })
                .from(reports);

            const [totalAppointmentsResult] = await db
                .select({ count: count() })
                .from(appointments)
                .where(eq(appointments.doctorId, user.id));

            const [avgConfidenceResult] = await db
                .select({ avg: avg(scans.aiConfidence) })
                .from(scans)
                .where(eq(scans.status, "completed"));

            // Recent scans for chart data
            const recentScans = await db.query.scans.findMany({
                orderBy: [desc(scans.uploadedAt)],
                limit: 50,
                with: { patient: true },
            });

            // Modality distribution
            const modalityDist = await db
                .select({ modality: scans.modality, count: count() })
                .from(scans)
                .groupBy(scans.modality);

            // Status distribution
            const statusDist = await db
                .select({ status: scans.status, count: count() })
                .from(scans)
                .groupBy(scans.status);

            return NextResponse.json({
                role: "doctor",
                stats: {
                    totalScans: totalScansResult.count,
                    pendingScans: pendingScansResult.count,
                    completedScans: completedScansResult.count,
                    totalPatients: totalPatientsResult.count,
                    totalReports: totalReportsResult.count,
                    totalAppointments: totalAppointmentsResult.count,
                    avgConfidence: avgConfidenceResult.avg ? parseFloat(String(avgConfidenceResult.avg)) : 0,
                },
                charts: {
                    modalityDistribution: modalityDist,
                    statusDistribution: statusDist,
                },
                recentScans: recentScans.slice(0, 5),
            });
        } else {
            // Patient analytics
            const [myScansResult] = await db
                .select({ count: count() })
                .from(scans)
                .where(eq(scans.patientId, user.id));

            const [completedResult] = await db
                .select({ count: count() })
                .from(scans)
                .where(and(eq(scans.patientId, user.id), eq(scans.status, "completed")));

            const [pendingResult] = await db
                .select({ count: count() })
                .from(scans)
                .where(and(eq(scans.patientId, user.id), eq(scans.status, "pending")));

            const [myAppointmentsResult] = await db
                .select({ count: count() })
                .from(appointments)
                .where(eq(appointments.patientId, user.id));

            const myRecentScans = await db.query.scans.findMany({
                where: eq(scans.patientId, user.id),
                orderBy: [desc(scans.uploadedAt)],
                limit: 5,
            });

            return NextResponse.json({
                role: "patient",
                stats: {
                    totalScans: myScansResult.count,
                    completedScans: completedResult.count,
                    pendingScans: pendingResult.count,
                    appointments: myAppointmentsResult.count,
                },
                recentScans: myRecentScans,
            });
        }
    } catch (error) {
        console.error("[/api/analytics] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
