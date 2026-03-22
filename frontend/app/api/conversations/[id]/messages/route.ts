import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { messages, conversations, users, notifications } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

// GET /api/conversations/[id]/messages — Get all messages in a conversation
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const conversationId = parseInt(params.id);
        if (isNaN(conversationId)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const msgs = await db.query.messages.findMany({
            where: eq(messages.conversationId, conversationId),
            with: { sender: true },
            orderBy: [asc(messages.createdAt)],
        });

        return NextResponse.json({ messages: msgs });
    } catch (error) {
        console.error("[messages GET] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/conversations/[id]/messages — Send a message
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
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

        const conversationId = parseInt(params.id);
        if (isNaN(conversationId)) {
            return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
        }

        const body = await req.json();
        const { content, type = "text" } = body;

        if (!content?.trim()) {
            return NextResponse.json({ error: "Content required" }, { status: 400 });
        }

        // Insert message
        const [msg] = await db
            .insert(messages)
            .values({
                conversationId,
                senderId: user.id,
                content: content.trim(),
                type: type as "text" | "scan" | "report",
            })
            .returning();

        // Update conversation lastMessageAt
        await db
            .update(conversations)
            .set({ lastMessageAt: new Date() })
            .where(eq(conversations.id, conversationId));

        // Create notification for the other user
        const convo = await db.query.conversations.findFirst({
            where: eq(conversations.id, conversationId),
        });

        if (convo) {
            const recipientId =
                convo.patientId === user.id ? convo.doctorId : convo.patientId;

            await db.insert(notifications).values({
                userId: recipientId,
                type: "message_received",
                message: `New message from ${user.name}`,
                link: `/doctor/messages?chat=${conversationId}`,
            });
        }

        return NextResponse.json({ message: msg });
    } catch (error) {
        console.error("[messages POST] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
