import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { appointments, users, notifications } from "@/lib/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

// GET /api/appointments — List appointments
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const whereClause =
            user.role === "doctor"
                ? eq(appointments.doctorId, user.id)
                : eq(appointments.patientId, user.id);

        const appts = await db.query.appointments.findMany({
            where: whereClause,
            with: { patient: true, doctor: true },
            orderBy: [desc(appointments.scheduledAt)],
        });

        return NextResponse.json({ appointments: appts });
    } catch (error) {
        console.error("[/api/appointments] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/appointments — Schedule a new appointment
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const body = await req.json();
        const { doctorId, patientId, scheduledAt, type, notes } = body;

        const resolvedPatientId = user.role === "patient" ? user.id : patientId;
        const resolvedDoctorId = user.role === "doctor" ? user.id : doctorId;

        if (!resolvedPatientId || !resolvedDoctorId || !scheduledAt) {
            return NextResponse.json(
                { error: "patientId, doctorId, scheduledAt required" },
                { status: 400 }
            );
        }

        const [appt] = await db
            .insert(appointments)
            .values({
                patientId: resolvedPatientId,
                doctorId: resolvedDoctorId,
                scheduledAt: new Date(scheduledAt),
                type: type || "follow_up",
                notes: notes || null,
                status: "scheduled",
            })
            .returning();

        // Notify the other party
        const recipientId =
            user.id === resolvedDoctorId ? resolvedPatientId : resolvedDoctorId;
        await db.insert(notifications).values({
            userId: recipientId,
            type: "appointment_scheduled",
            message: `New appointment scheduled by ${user.name}`,
            link: user.role === "doctor" ? "/patient/appointments" : "/doctor/appointments",
        });

        return NextResponse.json({ appointment: appt });
    } catch (error) {
        console.error("[/api/appointments POST] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH /api/appointments — Update appointment status
export async function PATCH(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { appointmentId, status } = body;

        if (!appointmentId || !status) {
            return NextResponse.json({ error: "appointmentId, status required" }, { status: 400 });
        }

        await db
            .update(appointments)
            .set({ status })
            .where(eq(appointments.id, appointmentId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[/api/appointments PATCH] Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
