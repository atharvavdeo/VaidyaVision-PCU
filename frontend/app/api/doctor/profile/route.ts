import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { doctorProfiles, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
            with: {
                doctorProfile: true
            }
        });

        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Unauthorized - Doctor only" }, { status: 403 });
        }

        return NextResponse.json({ profile: user.doctorProfile });

    } catch (error) {
        console.error("[GET /api/doctor/profile] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { specialty, degree, licenseNumber, experience } = body;

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Unauthorized - Doctor only" }, { status: 403 });
        }

        // Upsert profile
        const existingProfile = await db.query.doctorProfiles.findFirst({
            where: eq(doctorProfiles.userId, user.id)
        });

        if (existingProfile) {
            await db.update(doctorProfiles)
                .set({
                    specialty,
                    degree,
                    licenseNumber,
                    experience
                })
                .where(eq(doctorProfiles.id, existingProfile.id));
        } else {
            await db.insert(doctorProfiles).values({
                userId: user.id,
                specialty,
                degree,
                licenseNumber,
                experience,
                rating: 5.0, // Default for new profile
                totalConsultations: 0,
                totalScansReviewed: 0
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[PUT /api/doctor/profile] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
