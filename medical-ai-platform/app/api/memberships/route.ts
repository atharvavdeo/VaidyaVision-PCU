import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hospitalMemberships, hospitals, specialties, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import {
    getAuthUser, unauthorized, forbidden, badRequest,
    requireRoles, noPrimaryMembership,
} from "@/lib/api-auth";

// GET /api/memberships — list caller's active memberships
export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        const memberships = await db.query.hospitalMemberships.findMany({
            where: and(
                eq(hospitalMemberships.userId, user.id),
                eq(hospitalMemberships.status, "active")
            ),
            with: {
                hospital: true,
                specialty: true,
            },
        });

        return NextResponse.json({ memberships });
    } catch (error) {
        console.error("[GET /api/memberships]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/memberships — hospital_admin enrols a user
export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        const roleError = requireRoles(user, ["hospital_admin", "admin"]);
        if (roleError) return roleError;

        const body = await req.json();
        const { userId, hospitalId, membershipRole, specialtyId, title, employeeCode, licenseNumber } = body;

        if (!userId || !hospitalId || !membershipRole) {
            return badRequest("userId, hospitalId, membershipRole required");
        }

        if (!["doctor", "pathologist", "hospital_admin"].includes(membershipRole)) {
            return badRequest("Invalid membershipRole");
        }

        // Verify target user exists
        const targetUser = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });
        if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const [membership] = await db.insert(hospitalMemberships).values({
            userId,
            hospitalId,
            membershipRole,
            specialtyId: specialtyId || null,
            title: title || null,
            employeeCode: employeeCode || null,
            licenseNumber: licenseNumber || null,
            status: "active",
            isPrimary: false,
        }).returning();

        return NextResponse.json({ membership }, { status: 201 });
    } catch (error: any) {
        if (error?.message?.includes("UNIQUE")) {
            return NextResponse.json({ error: "Membership already exists for this user/hospital/role" }, { status: 409 });
        }
        console.error("[POST /api/memberships]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH /api/memberships — set primary membership
export async function PATCH(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) return unauthorized();

        const body = await req.json();
        const { membershipId, isPrimary } = body;

        if (!membershipId || isPrimary !== true) {
            return badRequest("membershipId and isPrimary: true required");
        }

        // Verify the membership belongs to the caller
        const membership = await db.query.hospitalMemberships.findFirst({
            where: and(
                eq(hospitalMemberships.id, membershipId),
                eq(hospitalMemberships.userId, user.id)
            ),
        });
        if (!membership) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

        // Clear primary from all user's memberships
        await db.update(hospitalMemberships)
            .set({ isPrimary: false })
            .where(eq(hospitalMemberships.userId, user.id));

        // Set new primary
        const [updated] = await db.update(hospitalMemberships)
            .set({ isPrimary: true })
            .where(eq(hospitalMemberships.id, membershipId))
            .returning();

        return NextResponse.json({ membership: updated });
    } catch (error) {
        console.error("[PATCH /api/memberships]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
