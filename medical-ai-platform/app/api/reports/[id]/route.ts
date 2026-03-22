import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";

// GET /api/reports/[id] — Get a single report with all details
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const reportId = parseInt(id);
        const report = await db.query.reports.findFirst({
            where: eq(reports.id, reportId),
            with: { scan: true, patient: true, doctor: true, hospitalTemplate: true },
        });

        if (!report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        // Check access: doctor who authored or patient who owns it
        if (user.role === "patient" && report.patientId !== user.id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        return NextResponse.json({ report });
    } catch (error) {
        console.error("[/api/reports/[id]] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
