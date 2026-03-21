import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";

// GET /api/notifications — Get notifications for current user
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

        const notifs = await db.query.notifications.findMany({
            where: eq(notifications.userId, user.id),
            orderBy: [desc(notifications.createdAt)],
            limit: 20,
        });

        const unreadCount = notifs.filter((n) => !n.isRead).length;

        return NextResponse.json({ notifications: notifs, unreadCount });
    } catch (error) {
        console.error("[notifications] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH /api/notifications — Mark all as read
export async function PATCH() {
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

        await db
            .update(notifications)
            .set({ isRead: true })
            .where(
                and(eq(notifications.userId, user.id), eq(notifications.isRead, false))
            );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[notifications PATCH] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
