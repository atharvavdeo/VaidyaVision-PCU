import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, hospitalMemberships, hospitals, specialties } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────────────

export type DbUser = typeof users.$inferSelect;
export type DbMembership = typeof hospitalMemberships.$inferSelect;
export type DbHospital = typeof hospitals.$inferSelect;

export type UserRole = "patient" | "doctor" | "admin" | "pathologist" | "hospital_admin";

// ── Auth Resolution ─────────────────────────────────────────────────────────

/**
 * Resolve the current Clerk session to a VaidyaVision DB user.
 * Returns null if not authenticated or user not found.
 */
export async function getAuthUser(): Promise<DbUser | null> {
    try {
        const { userId } = await auth();
        if (!userId) return null;

        const existingByClerkId = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (existingByClerkId) {
            return existingByClerkId;
        }

        // Fallback: link existing DB user by Clerk primary email.
        // This is useful when restoring a seeded SQLite DB whose clerk_id values
        // do not match the currently signed-in Clerk instance.
        const clerk = await currentUser();
        const primaryEmail = clerk?.primaryEmailAddress?.emailAddress?.trim().toLowerCase();
        if (!primaryEmail) return null;

        const existingByEmail = await db.query.users.findFirst({
            where: eq(users.email, primaryEmail),
        });

        if (!existingByEmail) return null;

        await db
            .update(users)
            .set({
                clerkId: userId,
                name: existingByEmail.name || clerk?.fullName || primaryEmail,
                imageUrl: existingByEmail.imageUrl || clerk?.imageUrl || null,
            })
            .where(eq(users.id, existingByEmail.id));

        const relinked = await db.query.users.findFirst({
            where: eq(users.id, existingByEmail.id),
        });

        return relinked ?? null;
    } catch {
        return null;
    }
}

/**
 * Assert that the user has one of the required roles.
 * Throws a NextResponse (403) if the check fails — callers should return it.
 */
export function requireRoles(user: DbUser, roles: UserRole[]): NextResponse | null {
    if (!roles.includes(user.role as UserRole)) {
        return NextResponse.json(
            { error: "FORBIDDEN", requiredRoles: roles, currentRole: user.role },
            { status: 403 }
        );
    }
    return null;
}

// ── Hospital / Membership Resolution ───────────────────────────────────────

export type MembershipResolution =
    | { ok: true; hospital: DbHospital; membership: DbMembership }
    | { ok: false; reason: "NO_PRIMARY_MEMBERSHIP"; memberships: DbMembership[] }
    | { ok: false; reason: "NOT_A_MEMBER" };

/**
 * Resolve the active hospital context for a clinician.
 * - If hospitalId provided: verify the user is an active member of that hospital.
 * - If not: use the primary membership.
 * - Returns a discriminated union so callers can surface the exact error.
 */
export async function resolveHospital(
    userId: number,
    hospitalId?: number | null
): Promise<MembershipResolution> {
    if (hospitalId) {
        const membership = await db.query.hospitalMemberships.findFirst({
            where: and(
                eq(hospitalMemberships.userId, userId),
                eq(hospitalMemberships.hospitalId, hospitalId),
                eq(hospitalMemberships.status, "active")
            ),
        });
        if (!membership) return { ok: false, reason: "NOT_A_MEMBER" };

        const hospital = await db.query.hospitals.findFirst({
            where: eq(hospitals.id, hospitalId),
        });
        if (!hospital) return { ok: false, reason: "NOT_A_MEMBER" };

        return { ok: true, hospital, membership };
    }

    // Resolve primary membership
    const primary = await db.query.hospitalMemberships.findFirst({
        where: and(
            eq(hospitalMemberships.userId, userId),
            eq(hospitalMemberships.isPrimary, true),
            eq(hospitalMemberships.status, "active")
        ),
    });

    if (!primary) {
        // Return all memberships so client can prompt user to pick/set primary
        const all = await db.select().from(hospitalMemberships)
            .where(and(
                eq(hospitalMemberships.userId, userId),
                eq(hospitalMemberships.status, "active")
            ));
        return { ok: false, reason: "NO_PRIMARY_MEMBERSHIP", memberships: all };
    }

    const hospital = await db.query.hospitals.findFirst({
        where: eq(hospitals.id, primary.hospitalId),
    });
    if (!hospital) return { ok: false, reason: "NOT_A_MEMBER" };

    return { ok: true, hospital, membership: primary };
}

// ── Projections ─────────────────────────────────────────────────────────────

/**
 * Strip clinician-internal fields from a case for patient consumption.
 * Patient only receives this when patientVisibilityStatus = released.
 */
export function patientCaseProjection(case_: Record<string, any>) {
    const {
        internalSummary: _i,
        sourceRole: _s,
        createdByUserId: _c,
        createdByMembershipId: _cm,
        primarySpecialtyId: _ps,
        primaryDoctorMembershipId: _pd,
        ...safe
    } = case_;
    return safe;
}

/**
 * Strip clinical content from a report for patient consumption.
 * Only patientSummary + release metadata is sent.
 */
export function patientReportProjection(report: Record<string, any>) {
    return {
        id: report.id,
        status: report.status,
        title: report.title,
        patientSummary: report.patientSummary,
        releasedMedicationsJson: report.releasedMedicationsJson,
        releasedAt: report.releasedAt,
    };
}

/**
 * Strip clinical content fields from a report for hospital admin consumption.
 * Admin sees metadata and status but not clinical content.
 */
export function adminReportProjection(report: Record<string, any>) {
    const {
        contentJson: _cj,
        htmlSnapshot: _hs,
        patientSummary: _ps,
        releasedMedicationsJson: _rm,
        ...meta
    } = report;
    return meta;
}

/**
 * Strip internal-only fields from a case for hospital admin consumption.
 * Admin sees metadata and assignments but not internalSummary or clinical notes.
 */
export function adminCaseProjection(case_: Record<string, any>) {
    const {
        internalSummary: _i,
        ...meta
    } = case_;
    return meta;
}

/**
 * Strip debug/AI fields from an artifact for patient consumption.
 */
export function patientArtifactProjection(artifact: Record<string, any>) {
    const {
        processingResultJson: _p,
        uploadedByUserId: _u,
        uploadedByMembershipId: _um,
        ...safe
    } = artifact;
    return safe;
}

// ── Response Helpers ─────────────────────────────────────────────────────────

export function unauthorized() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
    return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
    return NextResponse.json({ error: message }, { status: 404 });
}

export function badRequest(message: string) {
    return NextResponse.json({ error: message }, { status: 400 });
}

export function noPrimaryMembership(memberships: DbMembership[]) {
    return NextResponse.json(
        { error: "NO_PRIMARY_MEMBERSHIP", memberships },
        { status: 409 }
    );
}
