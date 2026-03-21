import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    cases, caseAssignments, hospitalMemberships, notifications, users, patientHospitalLinks,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";
import {
    getAuthUser, unauthorized, forbidden, badRequest,
    resolveHospital, noPrimaryMembership,
    patientCaseProjection, adminCaseProjection,
} from "@/lib/api-auth";

// GET /api/cases — list cases scoped to caller's role
export async function GET(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        const sp = req.nextUrl.searchParams;
        const hospitalIdParam = sp.get("hospitalId") ? parseInt(sp.get("hospitalId")!) : undefined;
        const statusFilter = sp.get("status") as string | null;
        const priorityFilter = sp.get("priority") as string | null;
        const patientIdFilter = sp.get("patientId") ? parseInt(sp.get("patientId")!) : undefined;

        // --- PATIENT ---
        if (user.role === "patient") {
            const query = await db.query.cases.findMany({
                where: and(
                    eq(cases.patientId, user.id),
                    eq(cases.patientVisibilityStatus, "released")
                ),
                orderBy: [desc(cases.createdAt)],
                with: { hospital: true },
            });
            return NextResponse.json({ cases: query.map(patientCaseProjection) });
        }

        // --- CLINICIAN / ADMIN ---
        const resolution = await resolveHospital(user.id, hospitalIdParam);
        if (!resolution.ok) {
            if (resolution.reason === "NO_PRIMARY_MEMBERSHIP") {
                return noPrimaryMembership(resolution.memberships);
            }
            return forbidden("Not a member of that hospital");
        }
        const { hospital } = resolution;

        // Build where conditions
        const conditions: any[] = [eq(cases.hospitalId, hospital.id)];
        if (statusFilter) conditions.push(eq(cases.status, statusFilter as any));
        if (priorityFilter) conditions.push(eq(cases.priority, priorityFilter as any));
        if (patientIdFilter) conditions.push(eq(cases.patientId, patientIdFilter));

        const caseList = await db.query.cases.findMany({
            where: and(...conditions),
            orderBy: [desc(cases.createdAt)],
            with: { hospital: true, assignments: true },
        });

        // Apply role-based projection
        const projected = user.role === "hospital_admin"
            ? caseList.map(adminCaseProjection)
            : caseList; // clinicians get full clinician view

        return NextResponse.json({ cases: projected });
    } catch (error) {
        console.error("[GET /api/cases]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/cases — create a new case (pathologist | doctor | hospital_admin)
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        if (!["doctor", "pathologist", "hospital_admin"].includes(user.role)) {
            return forbidden("Clinician access only");
        }

        const body = await req.json();
        const {
            hospitalId,
            patientId,
            sourceRole,
            title,
            presentingComplaint,
            priority,
            primarySpecialtyId,
            primaryDoctorMembershipId: explicitDoctorMembershipId,
        } = body;

        if (!hospitalId || !patientId || !sourceRole) {
            return badRequest("hospitalId, patientId, sourceRole required");
        }

        // Verify caller is a member of the hospital
        const resolution = await resolveHospital(user.id, hospitalId);
        if (!resolution.ok) return forbidden("Not a member of that hospital");
        const { membership } = resolution;

        // Create the case
        const [newCase] = await db.insert(cases).values({
            hospitalId,
            patientId,
            createdByUserId: user.id,
            createdByMembershipId: membership.id,
            sourceRole,
            title: title || null,
            presentingComplaint: presentingComplaint || null,
            priority: priority || "medium",
            primarySpecialtyId: primarySpecialtyId || null,
            status: "new",
            patientVisibilityStatus: "hidden",
        }).returning();

        // ── Auto-assignment logic ──────────────────────────────────────────
        let assignment = null;
        let assignedToMembershipId: number | null = null;

        if (explicitDoctorMembershipId) {
            assignedToMembershipId = explicitDoctorMembershipId;
        } else if (primarySpecialtyId) {
            // Find first active doctor with matching specialty at this hospital
            const doctorMembership = await db.query.hospitalMemberships.findFirst({
                where: and(
                    eq(hospitalMemberships.hospitalId, hospitalId),
                    eq(hospitalMemberships.membershipRole, "doctor"),
                    eq(hospitalMemberships.status, "active"),
                    eq(hospitalMemberships.specialtyId, primarySpecialtyId)
                ),
            });
            assignedToMembershipId = doctorMembership?.id ?? null;
        } else {
            // Fall back: first active doctor at hospital
            const anyDoctor = await db.query.hospitalMemberships.findFirst({
                where: and(
                    eq(hospitalMemberships.hospitalId, hospitalId),
                    eq(hospitalMemberships.membershipRole, "doctor"),
                    eq(hospitalMemberships.status, "active")
                ),
            });
            assignedToMembershipId = anyDoctor?.id ?? null;
        }

        if (assignedToMembershipId) {
            // Update case with primary doctor
            await db.update(cases)
                .set({ status: "assigned", primaryDoctorMembershipId: assignedToMembershipId })
                .where(eq(cases.id, newCase.id));

            // Create assignment row
            [assignment] = await db.insert(caseAssignments).values({
                caseId: newCase.id,
                assignedToMembershipId,
                assignedByUserId: user.id,
                specialtyId: primarySpecialtyId || null,
                assignmentType: "primary",
                status: "pending",
            }).returning();

            // Notify assigned doctor
            const doctorMembership = await db.query.hospitalMemberships.findFirst({
                where: eq(hospitalMemberships.id, assignedToMembershipId),
            });
            if (doctorMembership) {
                await createNotification({
                    userId: doctorMembership.userId,
                    type: "case_assigned",
                    message: "A new case has been assigned to you.",
                    link: `/doctor/cases/${newCase.id}`,
                });
            }
        }

        return NextResponse.json({ case: newCase, assignment }, { status: 201 });
    } catch (error) {
        console.error("[POST /api/cases]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
