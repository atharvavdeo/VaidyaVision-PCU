import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { reports, scans, users, hospitalReportTemplates } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

// GET /api/reports — List reports
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

        let reportList;
        if (user.role === "doctor") {
            reportList = await db.query.reports.findMany({
                where: eq(reports.doctorId, user.id),
                with: { scan: true, patient: true, doctor: true },
                orderBy: [desc(reports.createdAt)],
            });
        } else {
            reportList = await db.query.reports.findMany({
                where: eq(reports.patientId, user.id),
                with: { scan: true, doctor: true },
                orderBy: [desc(reports.createdAt)],
            });
        }

        return NextResponse.json({ reports: reportList });
    } catch (error) {
        console.error("[/api/reports] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/reports — Doctor creates a report from a scan
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });
        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        const body = await req.json();
        const { scanId, diagnosis, findings, recommendations, severity, hospitalTemplateId } = body;

        if (!scanId || !diagnosis || !findings) {
            return NextResponse.json({ error: "scanId, diagnosis, findings required" }, { status: 400 });
        }

        // Get scan to identify patient
        const scan = await db.query.scans.findFirst({
            where: eq(scans.id, scanId),
        });
        if (!scan) {
            return NextResponse.json({ error: "Scan not found" }, { status: 404 });
        }

        // Resolve hospitalTemplateId: explicit → doctor's hospital default → null
        let resolvedTemplateId: number | null = hospitalTemplateId || null;
        if (!resolvedTemplateId && user.hospitalId) {
            const defaultTemplate = await db.query.hospitalReportTemplates.findFirst({
                where: and(
                    eq(hospitalReportTemplates.hospitalId, user.hospitalId),
                    eq(hospitalReportTemplates.isDefault, true),
                ),
            });
            if (defaultTemplate) {
                resolvedTemplateId = defaultTemplate.id;
            }
        }

        const [report] = await db
            .insert(reports)
            .values({
                scanId,
                patientId: scan.patientId,
                doctorId: user.id,
                diagnosis,
                findings,
                recommendations: recommendations || null,
                severity: severity || "moderate",
                status: "signed",
                hospitalTemplateId: resolvedTemplateId,
                deliveryStatus: "pending",
            })
            .returning();

        // Update scan status
        await db
            .update(scans)
            .set({ status: "completed", doctorId: user.id, reviewedAt: new Date() })
            .where(eq(scans.id, scanId));

        return NextResponse.json({ report });
    } catch (error) {
        console.error("[/api/reports POST] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
