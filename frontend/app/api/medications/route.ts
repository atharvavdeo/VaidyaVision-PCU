import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, medications, medicationLogs } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

/**
 * GET /api/medications — List medications for the current user (patient or doctor viewing patient)
 * Query: ?patientId=123 (for doctors viewing a patient's medications)
 */
export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const { searchParams } = new URL(req.url);
        const patientIdParam = searchParams.get("patientId");

        let targetPatientId = user.id;

        // Doctors can view any patient's medications
        if (user.role === "doctor" && patientIdParam) {
            targetPatientId = parseInt(patientIdParam);
        }

        const meds = await db.query.medications.findMany({
            where: eq(medications.patientId, targetPatientId),
            orderBy: [desc(medications.createdAt)],
        });

        // Get today's logs
        const today = new Date().toISOString().split("T")[0];
        const todayLogs = await db.query.medicationLogs.findMany({
            where: and(
                eq(medicationLogs.patientId, targetPatientId),
                eq(medicationLogs.logDate, today),
            ),
        });

        return NextResponse.json({ medications: meds, todayLogs });
    } catch (error) {
        console.error("Medications GET error:", error);
        return NextResponse.json({ error: "Failed to fetch medications" }, { status: 500 });
    }
}

/**
 * POST /api/medications — Add a medication (doctor or patient)
 */
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const user = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        const body = await req.json();
        const {
            patientId, drugName, dosage, form, frequency,
            timeOfDay, duration, startDate, endDate, instructions, prescriptionId,
        } = body;

        const targetPatientId = user.role === "doctor" ? (patientId || user.id) : user.id;
        const addedBy = user.role === "doctor" ? "doctor" : "patient";

        const [med] = await db.insert(medications).values({
            patientId: targetPatientId,
            doctorId: user.role === "doctor" ? user.id : null,
            prescriptionId: prescriptionId || null,
            drugName,
            dosage: dosage || null,
            form: form || null,
            frequency: frequency || null,
            timeOfDay: timeOfDay ? JSON.stringify(timeOfDay) : null,
            duration: duration || null,
            startDate: startDate || new Date().toISOString().split("T")[0],
            endDate: endDate || null,
            instructions: instructions || null,
            addedBy,
        }).returning();

        return NextResponse.json({ success: true, medication: med });
    } catch (error) {
        console.error("Medications POST error:", error);
        return NextResponse.json({ error: "Failed to add medication" }, { status: 500 });
    }
}
