import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { reportDeliveries, appointmentIntents, users, reports } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Fetch the 50 most recent delivery jobs for this doctor's reports
        const recentDeliveries = await db.query.reportDeliveries.findMany({
            orderBy: [desc(reportDeliveries.createdAt)],
            limit: 50,
            with: {
                report: {
                    with: {
                        patient: true
                    }
                }
            }
        });

        // Filter out deliveries that don't belong to this doctor
        const filteredDeliveries = recentDeliveries.filter(d => d.report?.doctorId === user.id);

        // Fetch recent active appointment intents (WhatsApp responses)
        const recentIntents = await db.query.appointmentIntents.findMany({
            where: eq(appointmentIntents.doctorId, user.id),
            orderBy: [desc(appointmentIntents.createdAt)],
            limit: 50,
            with: { patient: true }
        });

        return NextResponse.json({
            deliveries: filteredDeliveries,
            intents: recentIntents
        });

    } catch (error) {
        console.error("GET /api/deliveries error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
