import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { exchangeCodeForTokens, getGoogleUserEmail } from "@/lib/integrations/google";
import { encrypt } from "@/lib/security/encrypt";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;
        const code = searchParams.get("code");
        const stateParam = searchParams.get("state");

        if (!code || !stateParam) {
            return NextResponse.redirect(new URL("/doctor/settings/email?error=missing_params", req.url));
        }

        // Decode state
        let state: { userId: number; clerkId: string };
        try {
            state = JSON.parse(Buffer.from(stateParam, "base64url").toString());
        } catch {
            return NextResponse.redirect(new URL("/doctor/settings/email?error=invalid_state", req.url));
        }

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code);

        // Get provider email
        const providerEmail = await getGoogleUserEmail(tokens.accessToken);

        // Encrypt tokens
        const accessTokenEncrypted = encrypt(tokens.accessToken);
        const refreshTokenEncrypted = encrypt(tokens.refreshToken);
        const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

        // Upsert connection
        const existing = await db.query.emailConnections.findFirst({
            where: and(
                eq(emailConnections.userId, state.userId),
                eq(emailConnections.provider, "gmail"),
            ),
        });

        if (existing) {
            await db.update(emailConnections).set({
                providerEmail,
                accessTokenEncrypted,
                refreshTokenEncrypted,
                expiresAt,
                scope: tokens.scope,
                status: "active",
                updatedAt: new Date(),
            }).where(eq(emailConnections.id, existing.id));
        } else {
            await db.insert(emailConnections).values({
                userId: state.userId,
                provider: "gmail",
                providerEmail,
                accessTokenEncrypted,
                refreshTokenEncrypted,
                expiresAt,
                scope: tokens.scope,
                status: "active",
            });
        }

        console.log(`[google/callback] Gmail connected: ${providerEmail} for user #${state.userId}`);

        return NextResponse.redirect(
            new URL("/doctor/settings/email?success=connected", req.url)
        );
    } catch (error) {
        console.error("[google/callback] Error:", error);
        return NextResponse.redirect(
            new URL(`/doctor/settings/email?error=${encodeURIComponent(String(error))}`, req.url)
        );
    }
}
