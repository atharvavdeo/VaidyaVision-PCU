import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildGoogleAuthUrl } from "@/lib/integrations/google";
import { getAuthUser } from "@/lib/api-auth";

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        // Encode user ID in state (simple for hackathon; sign in production)
        const state = Buffer.from(JSON.stringify({ userId: user.id, clerkId: user.clerkId })).toString("base64url");
        const authUrl = buildGoogleAuthUrl(state);

        return NextResponse.redirect(authUrl);
    } catch (error) {
        console.error("[google/start] Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
