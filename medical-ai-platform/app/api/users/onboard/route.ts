import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/users/onboard — Set role and mark onboarded
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { role } = body;

        if (!role || !["doctor", "patient", "admin"].includes(role)) {
            return NextResponse.json({ error: "Invalid role" }, { status: 400 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (!user) {
            return NextResponse.json({ error: "User not found — please refresh" }, { status: 404 });
        }

        if (user.isOnboarded) {
            return NextResponse.json({ error: "Already onboarded" }, { status: 409 });
        }

        await db
            .update(users)
            .set({
                role: role,
                isOnboarded: true,
            })
            .where(eq(users.clerkId, userId));

        return NextResponse.json({ success: true, role });
    } catch (error) {
        console.error("[/api/users/onboard] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
