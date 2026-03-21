import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/users/patients — List all patients (doctor only)
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

        const patients = await db.query.users.findMany({
            where: eq(users.role, "patient"),
            columns: {
                id: true,
                name: true,
                email: true,
                imageUrl: true,
                age: true,
                gender: true,
                bloodType: true,
                phone: true,
                medicalHistory: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ patients });
    } catch (error) {
        console.error("[/api/users/patients] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/users/patients — Doctor quick-adds a patient
export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const doctor = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (!doctor || doctor.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        const body = await req.json();
        const { name, email, age, gender, bloodType, phone, medicalHistory } = body;

        if (!name || !email) {
            return NextResponse.json({ error: "Name and email required" }, { status: 400 });
        }

        // Check if patient already exists
        const existing = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (existing) {
            return NextResponse.json({ error: "Patient with this email already exists", patient: existing }, { status: 409 });
        }

        const [patient] = await db.insert(users).values({
            name,
            email,
            clerkId: `doctor_added_${Date.now()}`,
            role: "patient",
            isOnboarded: true,
            age: age || null,
            gender: gender || null,
            bloodType: bloodType || null,
            phone: phone || null,
            medicalHistory: medicalHistory || null,
        }).returning();

        return NextResponse.json({ patient }, { status: 201 });
    } catch (error) {
        console.error("[/api/users/patients POST] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
