import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { familyMembers, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/family — List family members
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

        const members = await db.query.familyMembers.findMany({
            where: eq(familyMembers.patientId, user.id),
        });

        return NextResponse.json({ members });
    } catch (error) {
        console.error("[/api/family] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/family — Add a family member
export async function POST(req: NextRequest) {
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

        const body = await req.json();
        const { name, relation } = body;

        if (!name || !relation) {
            return NextResponse.json({ error: "name and relation required" }, { status: 400 });
        }

        const [member] = await db
            .insert(familyMembers)
            .values({ patientId: user.id, name, relation })
            .returning();

        return NextResponse.json({ member });
    } catch (error) {
        console.error("[/api/family POST] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE /api/family — Remove a family member
export async function DELETE(req: NextRequest) {
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

        const body = await req.json();
        const { memberId } = body;

        await db
            .delete(familyMembers)
            .where(
                and(eq(familyMembers.id, memberId), eq(familyMembers.patientId, user.id))
            );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[/api/family DELETE] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
