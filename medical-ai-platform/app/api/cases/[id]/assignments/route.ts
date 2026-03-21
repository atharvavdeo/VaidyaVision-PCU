import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { caseAssignments, cases, hospitalMemberships, notifications } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";
import {
    getAuthUser, unauthorized, forbidden, badRequest, notFound,
    resolveHospital,
} from "@/lib/api-auth";

// GET /api/cases/[id]/assignments
export async function GET(
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

        const assignments = await db.query.caseAssignments.findMany({
            where: eq(caseAssignments.caseId, caseId),
            with: {
                assignedToMembership: { with: { user: true, specialty: true } },
                assignedByUser: true,
            },
        });

        return NextResponse.json({ assignments });
    } catch (error) {
        console.error("[GET /api/cases/[id]/assignments]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/cases/[id]/assignments — create assignment (doctor | hospital_admin)
export async function POST(
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

        const body = await req.json();
        const { assignedToMembershipId, assignmentType, specialtyId, reason, dueAt } = body;

        if (!assignedToMembershipId) return badRequest("assignedToMembershipId required");

        // Verify target membership belongs to same hospital
        const targetMembership = await db.query.hospitalMemberships.findFirst({
            where: and(
                eq(hospitalMemberships.id, assignedToMembershipId),
                eq(hospitalMemberships.hospitalId, case_.hospitalId),
                eq(hospitalMemberships.status, "active")
            ),
        });
        if (!targetMembership) return notFound("Target membership not found in this hospital");

        const [assignment] = await db.insert(caseAssignments).values({
            caseId,
            assignedToMembershipId,
            assignedByUserId: user.id,
            specialtyId: specialtyId || null,
            assignmentType: assignmentType || "primary",
            reason: reason || null,
            dueAt: dueAt ? new Date(dueAt) : null,
            status: "pending",
        }).returning();

        // Update case status to assigned if still new/triaged
        if (["new", "triaged"].includes(case_.status)) {
            await db.update(cases)
                .set({ status: "assigned", primaryDoctorMembershipId: assignedToMembershipId, updatedAt: new Date() })
                .where(eq(cases.id, caseId));
        }

        // Notify assigned doctor
        await createNotification({
            userId: targetMembership.userId,
            type: "case_assigned",
            message: "A new case has been assigned to you.",
            link: `/doctor/cases/${caseId}`,
        });

        return NextResponse.json({ assignment }, { status: 201 });
    } catch (error: any) {
        if (error?.message?.includes("UNIQUE")) {
            return NextResponse.json({ error: "This member already has an assignment of this type" }, { status: 409 });
        }
        console.error("[POST /api/cases/[id]/assignments]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH /api/cases/[id]/assignments — update assignment status (assigned member only)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        const caseId = parseInt(params.id);
        if (isNaN(caseId)) return badRequest("Invalid case id");

        const body = await req.json();
        const { assignmentId, status } = body;

        if (!assignmentId || !status) return badRequest("assignmentId and status required");
        if (!["accepted", "completed"].includes(status)) {
            return badRequest("status must be 'accepted' or 'completed'");
        }

        const assignment = await db.query.caseAssignments.findFirst({
            where: eq(caseAssignments.id, assignmentId),
            with: { assignedToMembership: true },
        });
        if (!assignment) return notFound("Assignment not found");
        if (assignment.caseId !== caseId) return badRequest("Assignment does not belong to this case");

        // Only the assigned member (or an admin) can update
        if (
            assignment.assignedToMembership.userId !== user.id &&
            user.role !== "hospital_admin"
        ) {
            return forbidden("Only the assigned member can update this assignment");
        }

        const updateData: Record<string, any> = { status };
        if (status === "accepted") updateData.acceptedAt = new Date();
        if (status === "completed") updateData.completedAt = new Date();

        // Also update case status
        if (status === "accepted") {
            await db.update(cases)
                .set({ status: "in_review", updatedAt: new Date() })
                .where(eq(cases.id, caseId));
        }

        const [updated] = await db.update(caseAssignments)
            .set(updateData)
            .where(eq(caseAssignments.id, assignmentId))
            .returning();

        return NextResponse.json({ assignment: updated });
    } catch (error) {
        console.error("[PATCH /api/cases/[id]/assignments]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
