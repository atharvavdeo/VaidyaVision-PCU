import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cases, hospitalMemberships } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
    getAuthUser, unauthorized, forbidden, badRequest, notFound,
    resolveHospital, patientCaseProjection, adminCaseProjection,
} from "@/lib/api-auth";

// GET /api/cases/[id] — fetch case detail (role-scoped)
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        const caseId = parseInt(params.id);
        if (isNaN(caseId)) return badRequest("Invalid case id");

        const case_ = await db.query.cases.findFirst({
            where: eq(cases.id, caseId),
            with: {
                hospital: true,
                assignments: true,
            },
        });
        if (!case_) return notFound("Case not found");

        // PATIENT: only if released
        if (user.role === "patient") {
            if (case_.patientId !== user.id) return forbidden();
            if (case_.patientVisibilityStatus !== "released") return forbidden("Case not yet released");
            return NextResponse.json({ case: patientCaseProjection(case_) });
        }

        // CLINICIANS / ADMIN: must be member of same hospital
        const resolution = await resolveHospital(user.id, case_.hospitalId);
        if (!resolution.ok) return forbidden("Not a member of this hospital");

        // Apply role projection
        const projected = user.role === "hospital_admin"
            ? adminCaseProjection(case_)
            : case_;

        return NextResponse.json({ case: projected });
    } catch (error) {
        console.error("[GET /api/cases/[id]]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH /api/cases/[id] — update case metadata
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        if (!["doctor", "pathologist", "hospital_admin"].includes(user.role)) {
            return forbidden("Clinician access only");
        }

        const caseId = parseInt(params.id);
        if (isNaN(caseId)) return badRequest("Invalid case id");

        const case_ = await db.query.cases.findFirst({ where: eq(cases.id, caseId) });
        if (!case_) return notFound("Case not found");

        const resolution = await resolveHospital(user.id, case_.hospitalId);
        if (!resolution.ok) return forbidden("Not a member of this hospital");

        const body = await req.json();
        const { status, priority, internalSummary, title } = body;

        // Validate status transitions
        const validTransitions: Record<string, string[]> = {
            new: ["triaged", "assigned", "closed"],
            triaged: ["assigned", "closed"],
            assigned: ["in_review", "closed"],
            in_review: ["signed", "closed"],
            signed: ["released", "closed"],
            released: ["closed"],
            closed: [],
        };

        if (status && !validTransitions[case_.status]?.includes(status)) {
            return badRequest(`Cannot transition from ${case_.status} to ${status}`);
        }

        const updateData: Record<string, any> = {};
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;
        if (internalSummary !== undefined) updateData.internalSummary = internalSummary;
        if (title !== undefined) updateData.title = title;
        updateData.updatedAt = new Date();

        const [updated] = await db.update(cases)
            .set(updateData)
            .where(eq(cases.id, caseId))
            .returning();

        return NextResponse.json({ case: updated });
    } catch (error) {
        console.error("[PATCH /api/cases/[id]]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
