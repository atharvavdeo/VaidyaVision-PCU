import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseReports, caseReportVersions, caseArtifacts, cases } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
    getAuthUser, unauthorized, forbidden, badRequest, notFound,
    resolveHospital, patientReportProjection, adminReportProjection,
} from "@/lib/api-auth";
import { createNotification } from "@/lib/notifications";

// GET /api/cases/[id]/reports
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        const caseId = parseInt(params.id);
        if (isNaN(caseId)) return badRequest("Invalid case id");

        const case_ = await db.query.cases.findFirst({ where: eq(cases.id, caseId) });
        if (!case_) return notFound("Case not found");

        // PATIENT: only released reports, stripped projection
        if (user.role === "patient") {
            if (case_.patientId !== user.id) return forbidden();
            if (case_.patientVisibilityStatus !== "released") return forbidden("Case not released");

            const reports = await db.query.caseReports.findMany({
                where: and(eq(caseReports.caseId, caseId), eq(caseReports.status, "released")),
            });
            return NextResponse.json({ reports: reports.map(patientReportProjection) });
        }

        // CLINICIANS/ADMIN
        const resolution = await resolveHospital(user.id, case_.hospitalId);
        if (!resolution.ok) return forbidden("Not a member of this hospital");

        const reports = await db.query.caseReports.findMany({
            where: eq(caseReports.caseId, caseId),
            with: { authoredByUser: true, template: true },
        });

        const projected = user.role === "hospital_admin"
            ? reports.map(adminReportProjection)
            : reports;

        return NextResponse.json({ reports: projected });
    } catch (error) {
        console.error("[GET /api/cases/[id]/reports]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/cases/[id]/reports — create draft (doctor only)
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        if (user.role !== "doctor") return forbidden("Doctor access only");

        const caseId = parseInt(params.id);
        if (isNaN(caseId)) return badRequest("Invalid case id");

        const case_ = await db.query.cases.findFirst({ where: eq(cases.id, caseId) });
        if (!case_) return notFound("Case not found");

        const resolution = await resolveHospital(user.id, case_.hospitalId);
        if (!resolution.ok) return forbidden("Not a member of this hospital");
        const { membership } = resolution;

        const body = await req.json();
        const { templateId, title, contentJson, patientSummary, releasedMedicationsJson } = body;

        const [report] = await db.insert(caseReports).values({
            caseId,
            hospitalId: case_.hospitalId,
            templateId: templateId || null,
            authoredByUserId: user.id,
            authoredByMembershipId: membership.id,
            title: title || null,
            contentJson: contentJson ? JSON.stringify(contentJson) : null,
            patientSummary: patientSummary || null,
            status: "draft",
        }).returning();

        // Create version 1 snapshot
        await db.insert(caseReportVersions).values({
            reportId: report.id,
            versionNumber: 1,
            editedByUserId: user.id,
            editedByMembershipId: membership.id,
            contentJson: report.contentJson,
            changeSummary: "Initial draft",
        });

        return NextResponse.json({ report }, { status: 201 });
    } catch (error) {
        console.error("[POST /api/cases/[id]/reports]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH /api/cases/[id]/reports — sign or release
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        if (!["doctor", "hospital_admin"].includes(user.role)) {
            return forbidden("Doctor or hospital_admin access only");
        }

        const caseId = parseInt(params.id);
        if (isNaN(caseId)) return badRequest("Invalid case id");

        const case_ = await db.query.cases.findFirst({ where: eq(cases.id, caseId) });
        if (!case_) return notFound("Case not found");

        const resolution = await resolveHospital(user.id, case_.hospitalId);
        if (!resolution.ok) return forbidden("Not a member of this hospital");
        const { membership } = resolution;

        const body = await req.json();
        const { reportId, action, releaseArtifacts, contentJson, patientSummary, releasedMedicationsJson } = body;

        if (!reportId || !action) return badRequest("reportId and action required");
        if (!["sign", "release"].includes(action)) return badRequest("action must be 'sign' or 'release'");

        // Only doctor can sign; doctor or admin can release
        if (action === "sign" && user.role !== "doctor") {
            return forbidden("Only doctor can sign a report");
        }

        const report = await db.query.caseReports.findFirst({
            where: and(eq(caseReports.id, reportId), eq(caseReports.caseId, caseId)),
        });
        if (!report) return notFound("Report not found");

        // Validate transition
        if (action === "sign" && report.status !== "draft") {
            return badRequest("Only draft reports can be signed");
        }
        if (action === "release" && report.status !== "signed") {
            return badRequest("Only signed reports can be released");
        }

        // Count existing versions for snapshot
        const existingVersions = await db.query.caseReportVersions.findMany({
            where: eq(caseReportVersions.reportId, reportId),
        });

        if (action === "sign") {
            const updateData: Record<string, any> = {
                status: "signed",
                signedAt: new Date(),
                updatedAt: new Date(),
            };
            if (contentJson !== undefined) updateData.contentJson = JSON.stringify(contentJson);
            if (patientSummary !== undefined) updateData.patientSummary = patientSummary;
            if (releasedMedicationsJson !== undefined) updateData.releasedMedicationsJson = releasedMedicationsJson;

            const [updated] = await db.update(caseReports)
                .set(updateData)
                .where(eq(caseReports.id, reportId))
                .returning();

            // Create version snapshot
            await db.insert(caseReportVersions).values({
                reportId,
                versionNumber: existingVersions.length + 1,
                editedByUserId: user.id,
                editedByMembershipId: membership.id,
                contentJson: updateData.contentJson || report.contentJson,
                changeSummary: "Signed",
            });

            // Update case status
            await db.update(cases)
                .set({ status: "signed", updatedAt: new Date() })
                .where(eq(cases.id, caseId));

            return NextResponse.json({ report: updated });
        }

        // RELEASE
        const [updated] = await db.update(caseReports)
            .set({ status: "released", releasedAt: new Date(), updatedAt: new Date() })
            .where(eq(caseReports.id, reportId))
            .returning();

        // Update case visibility and status
        await db.update(cases)
            .set({ status: "released", patientVisibilityStatus: "released", updatedAt: new Date() })
            .where(eq(cases.id, caseId));

        // Optionally flip artifacts to patient-visible
        if (releaseArtifacts === true) {
            await db.update(caseArtifacts)
                .set({ patientVisible: true })
                .where(and(
                    eq(caseArtifacts.caseId, caseId),
                    eq(caseArtifacts.status, "processed")
                ));
        }

        // Create version snapshot
        await db.insert(caseReportVersions).values({
            reportId,
            versionNumber: existingVersions.length + 1,
            editedByUserId: user.id,
            editedByMembershipId: membership.id,
            contentJson: report.contentJson,
            changeSummary: "Released to patient",
        });

        // Notify patient
        await createNotification({
            userId: case_.patientId,
            type: "report_signed",
            message: "Your report has been released and is now available.",
            link: `/patient/cases/${caseId}`,
        });

        return NextResponse.json({ report: updated });
    } catch (error) {
        console.error("[PATCH /api/cases/[id]/reports]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
