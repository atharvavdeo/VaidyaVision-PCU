import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// POST /api/users/sync — Upsert user from Clerk
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { name, email, imageUrl } = body;

        // Check if user exists
        const existing = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (existing) {
            // Update existing user
            await db
                .update(users)
                .set({
                    name: name || existing.name,
                    email: email || existing.email,
                    imageUrl: imageUrl || existing.imageUrl,
                })
                .where(eq(users.clerkId, userId));

            return NextResponse.json({ id: existing.id, updated: true });
        }

        // Create new user (default role = patient, not yet onboarded)
        const [newUser] = await db
            .insert(users)
            .values({
                clerkId: userId,
                role: "patient",
                name: name || "Anonymous User",
                email: email || "",
                imageUrl: imageUrl || null,
                isOnboarded: false,
            })
            .returning();

        return NextResponse.json({ id: newUser.id, created: true });
    } catch (error) {
        console.error("[/api/users/sync] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
