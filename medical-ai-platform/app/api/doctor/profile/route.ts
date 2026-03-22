import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { doctorProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";

export async function GET() {
    try {
        const user = await getAuthUser();

        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Unauthorized - Doctor only" }, { status: 403 });
        }

        const doctorProfile = await db.query.doctorProfiles.findFirst({
            where: eq(doctorProfiles.userId, user.id),
        });

        return NextResponse.json({ profile: doctorProfile });

    } catch (error) {
        console.error("[GET /api/doctor/profile] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { specialty, degree, licenseNumber, experience } = body;

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
