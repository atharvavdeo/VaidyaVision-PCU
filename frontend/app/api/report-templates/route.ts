import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hospitalReportTemplates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
    getAuthUser, unauthorized, forbidden, badRequest,
    resolveHospital, requireRoles,
} from "@/lib/api-auth";

// GET /api/report-templates?hospitalId= — list templates for a hospital
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        const hospitalIdParam = req.nextUrl.searchParams.get("hospitalId");
        if (!hospitalIdParam) return badRequest("hospitalId query param required");

        const hospitalId = parseInt(hospitalIdParam);
        if (isNaN(hospitalId)) return badRequest("Invalid hospitalId");

        // Verify caller has access to this hospital
        const resolution = await resolveHospital(user.id, hospitalId);
        if (!resolution.ok) return forbidden("Not a member of this hospital");

        const templates = await db.select().from(hospitalReportTemplates)
            .where(and(
                eq(hospitalReportTemplates.hospitalId, hospitalId),
                eq(hospitalReportTemplates.isActive, true)
            ));

        return NextResponse.json({ templates });
    } catch (error) {
        console.error("[GET /api/report-templates]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/report-templates — create a template (hospital_admin only)
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        const roleError = requireRoles(user, ["hospital_admin", "admin"]);
        if (roleError) return roleError;

        const body = await req.json();
        const {
            hospitalId, name, sectionSchemaJson, isDefault,
            disclaimerText, signatureConfigJson,
            headerImageUrl, footerImageUrl, logoUrl,
        } = body;

        if (!hospitalId || !name) return badRequest("hospitalId and name required");

        // Verify admin is a member of this hospital
        const resolution = await resolveHospital(user.id, hospitalId);
        if (!resolution.ok) return forbidden("Not a member of this hospital");

        // If isDefault, un-default others for this hospital
        if (isDefault) {
            await db.update(hospitalReportTemplates)
                .set({ isDefault: false })
                .where(eq(hospitalReportTemplates.hospitalId, hospitalId));
        }

        const [template] = await db.insert(hospitalReportTemplates).values({
            hospitalId,
            name,
            version: 1,
            isDefault: isDefault || false,
            isActive: true,
            sectionSchemaJson: sectionSchemaJson ? JSON.stringify(sectionSchemaJson) : null,
            disclaimerText: disclaimerText || null,
            signatureConfigJson: signatureConfigJson ? JSON.stringify(signatureConfigJson) : null,
            headerImageUrl: headerImageUrl || null,
            footerImageUrl: footerImageUrl || null,
            logoUrl: logoUrl || null,
        }).returning();

        return NextResponse.json({ template }, { status: 201 });
    } catch (error: any) {
        if (error?.message?.includes("UNIQUE")) {
            return NextResponse.json({ error: "Template name/version already exists for this hospital" }, { status: 409 });
        }
        console.error("[POST /api/report-templates]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
