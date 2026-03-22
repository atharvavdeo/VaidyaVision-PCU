import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";

export async function POST() {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        const connection = await db.query.emailConnections.findFirst({
            where: and(
                eq(emailConnections.userId, user.id),
                eq(emailConnections.provider, "gmail"),
            ),
        });

        if (!connection) {
            return NextResponse.json({ error: "No Gmail connection found" }, { status: 404 });
        }

        // Mark as revoked (don't delete — audit trail)
        await db.update(emailConnections).set({
            status: "revoked",
            updatedAt: new Date(),
        }).where(eq(emailConnections.id, connection.id));

        return NextResponse.json({ disconnected: true });
    } catch (error) {
        console.error("[google/disconnect] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
