import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { apiKeys, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";

function generateApiKey(env: "test" | "live"): string {
    const prefix = env === "live" ? "vv_live_" : "vv_test_";
    const random = randomBytes(32).toString("hex");
    return `${prefix}${random}`;
}

// GET  — list all API keys for the current user
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const keys = await db.query.apiKeys.findMany({
            where: eq(apiKeys.userId, user.id),
            orderBy: (apiKeys, { desc }) => [desc(apiKeys.createdAt)],
        });

        // Never return the full key after creation — only prefix + last 4
        const safeKeys = keys.map((k) => ({
            ...k,
            key: `${k.prefix}...${k.key.slice(-4)}`,
        }));

        return NextResponse.json({ keys: safeKeys });
    } catch (error) {
        console.error("[API Keys GET]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST — create a new API key
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const body = await req.json();
        const { name, environment = "test", scopes = "predict,ocr" } = body;

        if (!name || name.trim().length < 2) {
            return NextResponse.json({ error: "Key name is required (min 2 characters)" }, { status: 400 });
        }

        // Limit to 10 keys per user
        const existing = await db.query.apiKeys.findMany({ where: eq(apiKeys.userId, user.id) });
        if (existing.length >= 10) {
            return NextResponse.json({ error: "Maximum 10 API keys per account" }, { status: 400 });
        }

        const key = generateApiKey(environment as "test" | "live");
        const prefix = key.slice(0, 8);

        const [created] = await db.insert(apiKeys).values({
            userId: user.id,
            name: name.trim(),
            key,
            prefix,
            environment: environment as "test" | "live",
            scopes,
            rateLimit: environment === "live" ? 60 : 100,
        }).returning();

        // Return the FULL key only on creation — user must copy it now
        return NextResponse.json({
            key: {
                ...created,
                fullKey: key,   // only returned once
            },
        });
    } catch (error) {
        console.error("[API Keys POST]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE — revoke an API key
export async function DELETE(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { searchParams } = new URL(req.url);
        const keyId = searchParams.get("id");
        if (!keyId) return NextResponse.json({ error: "Key ID required" }, { status: 400 });

        await db.delete(apiKeys).where(
            and(eq(apiKeys.id, parseInt(keyId)), eq(apiKeys.userId, user.id))
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[API Keys DELETE]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
