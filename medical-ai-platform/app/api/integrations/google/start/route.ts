import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { buildGoogleAuthUrl } from "@/lib/integrations/google";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });
        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        // Encode user ID in state (simple for hackathon; sign in production)
        const state = Buffer.from(JSON.stringify({ userId: user.id, clerkId: userId })).toString("base64url");
        const authUrl = buildGoogleAuthUrl(state);

        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error("[google/start] Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
