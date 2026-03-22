import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";

export async function GET() {
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
            return NextResponse.json({ connected: false });
        }

        return NextResponse.json({
            connected: true,
            providerEmail: connection.providerEmail,
            status: connection.status,
            connectedAt: connection.createdAt,
        });
    } catch (error) {
        console.error("[google/status] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
