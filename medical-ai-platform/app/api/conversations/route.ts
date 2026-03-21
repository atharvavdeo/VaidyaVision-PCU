import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { conversations, users, messages } from "@/lib/db/schema";
import { eq, or, desc } from "drizzle-orm";

// GET /api/conversations — List conversations for current user
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

        const convos = await db.query.conversations.findMany({
            where: or(
                eq(conversations.patientId, user.id),
                eq(conversations.doctorId, user.id)
            ),
            with: {
                patient: true,
                doctor: true,
                messages: {
                    orderBy: [desc(messages.createdAt)],
                    limit: 1,
                },
            },
            orderBy: [desc(conversations.lastMessageAt)],
        });

        return NextResponse.json({ conversations: convos });
    } catch (error) {
        console.error("[/api/conversations] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/conversations — Create or find existing conversation
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
        const { otherUserId } = body;

        if (!otherUserId) {
            return NextResponse.json({ error: "otherUserId required" }, { status: 400 });
        }

        const patientId = user.role === "patient" ? user.id : otherUserId;
        const doctorId = user.role === "doctor" ? user.id : otherUserId;

        // Check for existing conversation
        const existing = await db.query.conversations.findFirst({
            where: (c, { and, eq }) =>
                and(eq(c.patientId, patientId), eq(c.doctorId, doctorId)),
        });

        if (existing) {
            return NextResponse.json({ conversation: existing });
        }

        // Create new conversation
        const [convo] = await db
            .insert(conversations)
            .values({ patientId, doctorId })
            .returning();

        return NextResponse.json({ conversation: convo });
    } catch (error) {
        console.error("[/api/conversations] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
