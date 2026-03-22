import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, scans, reports, appointments } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET /api/doctor/patients/[id] — Get patient details + full scan/report history
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const currentUser = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });

        if (!currentUser || currentUser.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        const patientId = parseInt(params.id);
        if (isNaN(patientId)) {
            return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
        }

        // Get patient info
        const patient = await db.query.users.findFirst({
            where: and(eq(users.id, patientId), eq(users.role, "patient")),
        });

        if (!patient) {
            return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }

        // Get all scans for this patient
        const patientScans = await db.query.scans.findMany({
            where: eq(scans.patientId, patientId),
            orderBy: [desc(scans.uploadedAt)],
        });

        // Get all reports for this patient
        const patientReports = await db.query.reports.findMany({
            where: eq(reports.patientId, patientId),
            orderBy: [desc(reports.createdAt)],
        });

        // Get appointments for this patient
        const patientAppointments = await db.query.appointments.findMany({
            where: eq(appointments.patientId, patientId),
            orderBy: [desc(appointments.scheduledAt)],
        });

        return NextResponse.json({
            patient,
            scans: patientScans,
            reports: patientReports,
            appointments: patientAppointments,
        });
    } catch (error) {
        console.error("[/api/doctor/patients/:id] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
