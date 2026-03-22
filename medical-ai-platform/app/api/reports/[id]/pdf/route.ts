import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reports } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildReportPayload } from "@/lib/reports/buildReportPayload";
import { renderToBuffer } from "@react-pdf/renderer";
import { HospitalReportDocument } from "@/lib/reports/renderHospitalReportPdf";
import { mkdir, writeFile, access } from "fs/promises";
import path from "path";
import React from "react";
import { getAuthUser } from "@/lib/api-auth";

const REPORTS_DIR = path.join(process.cwd(), "public", "generated-reports");

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await access(filePath);
        return true;
    } catch {
        return false;
    }
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // 1. Auth
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 2. Load report
        const { id } = await params;
        const reportId = parseInt(id);
        if (isNaN(reportId)) {
            return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
        }

        const report = await db.query.reports.findFirst({
            where: eq(reports.id, reportId),
        });
        if (!report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        // 3. Access control
        // Doctor who owns the report can always generate/view
        // Patient can view only if releasedAt is set
        if (user.role === "doctor" && report.doctorId !== user.id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }
        if (user.role === "patient") {
            if (report.patientId !== user.id) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
            if (!report.releasedAt) {
                return NextResponse.json(
                    { error: "Report has not been released yet" },
                    { status: 403 }
                );
            }
        }

        // 4. Idempotent: check if PDF already exists on disk
        const refresh = req.nextUrl.searchParams.get("refresh") === "true";
        const pdfFilename = `report-${reportId}.pdf`;
        const pdfPath = path.join(REPORTS_DIR, pdfFilename);

        if (!refresh && report.pdfUrl && await fileExists(pdfPath)) {
            // Return existing PDF
            const { readFile } = await import("fs/promises");
            const buffer = await readFile(pdfPath);
            return new NextResponse(buffer, {
                status: 200,
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `inline; filename="${pdfFilename}"`,
                    "Cache-Control": "private, max-age=300",
                },
            });
        }

        // 5. Build payload
        const payload = await buildReportPayload(reportId);

        // 6. Render PDF
        const pdfBuffer = await renderToBuffer(
            React.createElement(HospitalReportDocument, { payload }) as any
        );

        // 7. Save to disk
        await mkdir(REPORTS_DIR, { recursive: true });
        await writeFile(pdfPath, Buffer.from(pdfBuffer));

        // 8. Update reports.pdfUrl
        const pdfUrl = `/generated-reports/${pdfFilename}`;
        await db.update(reports).set({ pdfUrl }).where(eq(reports.id, reportId));

        // 9. Return PDF
        return new NextResponse(Buffer.from(pdfBuffer), {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${pdfFilename}"`,
                "Cache-Control": "private, max-age=300",
            },
        });
    } catch (error) {
        console.error("[/api/reports/[id]/pdf] Error:", error);
        return NextResponse.json(
            { error: "PDF generation failed", detail: String(error) },
            { status: 500 }
        );
    }
}
