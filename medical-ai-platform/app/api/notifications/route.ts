import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";

// GET /api/notifications — Get notifications for current user
export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [notifs, unreadRes] = await Promise.all([
            db.query.notifications.findMany({
                where: eq(notifications.userId, user.id),
                orderBy: [desc(notifications.createdAt)],
                limit: 20,
            }),
            db.select({ count: sql<number>`count(*)` })
              .from(notifications)
              .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)))
        ]);

        const unreadCount = unreadRes[0]?.count || 0;

        return NextResponse.json({ notifications: notifs, unreadCount });
    } catch (error) {
        console.error("[notifications] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH /api/notifications — Mark all as read
export async function PATCH() {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
