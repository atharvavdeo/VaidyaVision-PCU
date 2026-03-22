import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
    appointments,
    conversations,
    doctorPrescriptions,
    exerciseLogs,
    exerciseRoutines,
    familyMembers,
    medicationLogs,
    medications,
    messages,
    patientAllergies,
    patientConditions,
    patientFiles,
    patientNotes,
    prescriptions,
    reports,
    scans,
    users,
    voiceNotes,
} from "@/lib/db/schema";
import { desc, eq, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/api-auth";
import { canDoctorAccessPatient } from "@/lib/doctor-patient-access";

type TimelineType =
    | "scan"
    | "report"
    | "appointment"
    | "note"
    | "file"
    | "doctor_prescription"
    | "ocr_prescription"
    | "message"
    | "voice_note";

type TimelineEvent = {
    id: number;
    type: TimelineType;
    date: string;
    summary: string;
    record_id: number;
};

function toIso(value: Date | null | undefined): string {
    return (value ?? new Date()).toISOString();
}

function shortText(value: string | null | undefined, fallback: string): string {
    if (!value || value.trim().length === 0) return fallback;
    return value.slice(0, 60);
}

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const currentUser = await getAuthUser();
        if (!currentUser) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (currentUser.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        const { id } = await params;
        const patientId = Number.parseInt(id, 10);
        if (Number.isNaN(patientId)) {
            return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
        }

        const patient = await db.query.users.findFirst({
            where: eq(users.id, patientId),
        });

        if (!patient || patient.role !== "patient") {
            return NextResponse.json({ error: "Patient not found" }, { status: 404 });
        }

        const canAccess = await canDoctorAccessPatient(currentUser.id, patientId);
        if (!canAccess) {
            return NextResponse.json({ error: "You do not have access to this patient." }, { status: 403 });
        }

        const [patientScans, patientConversations] = await Promise.all([
            db.select({ id: scans.id }).from(scans).where(eq(scans.patientId, patientId)),
            db.select({ id: conversations.id }).from(conversations).where(eq(conversations.patientId, patientId)),
        ]);

        const scanIds = patientScans.map((scanRow) => scanRow.id);
        const conversationIds = patientConversations.map((conversation) => conversation.id);

        const [
            allScans,
            allReports,
            allAppointments,
            allVoiceNotes,
            allMessages,
            allFamilyMembers,
            allOcrPrescriptions,
            allMedications,
            allMedicationLogs,
            allExerciseRoutines,
            allExerciseLogs,
            allNotes,
            allFiles,
            allDoctorPrescriptions,
            allAllergies,
            allConditions,
        ] = await Promise.all([
            db.query.scans.findMany({
                where: eq(scans.patientId, patientId),
                orderBy: [desc(scans.uploadedAt)],
            }),

            db.query.reports.findMany({
                where: eq(reports.patientId, patientId),
                orderBy: [desc(reports.createdAt)],
            }),

            db.query.appointments.findMany({
                where: eq(appointments.patientId, patientId),
                orderBy: [desc(appointments.scheduledAt)],
            }),

            scanIds.length > 0
                ? db.query.voiceNotes.findMany({
                    where: inArray(voiceNotes.scanId, scanIds),
                    orderBy: [desc(voiceNotes.createdAt)],
                })
                : Promise.resolve([]),

            conversationIds.length > 0
                ? db.query.messages.findMany({
                    where: inArray(messages.conversationId, conversationIds),
                    orderBy: [desc(messages.createdAt)],
                })
                : Promise.resolve([]),

            db.query.familyMembers.findMany({
                where: eq(familyMembers.patientId, patientId),
            }),

            db.query.prescriptions.findMany({
                where: eq(prescriptions.patientId, patientId),
                orderBy: [desc(prescriptions.uploadedAt)],
            }),

            db.query.medications.findMany({
                where: eq(medications.patientId, patientId),
                orderBy: [desc(medications.createdAt)],
            }),

            db.query.medicationLogs.findMany({
                where: eq(medicationLogs.patientId, patientId),
                orderBy: [desc(medicationLogs.createdAt)],
            }),

            db.query.exerciseRoutines.findMany({
                where: eq(exerciseRoutines.patientId, patientId),
                orderBy: [desc(exerciseRoutines.createdAt)],
            }),

            db.query.exerciseLogs.findMany({
                where: eq(exerciseLogs.patientId, patientId),
                orderBy: [desc(exerciseLogs.createdAt)],
            }),

            db.query.patientNotes.findMany({
                where: eq(patientNotes.patientId, patientId),
                orderBy: [desc(patientNotes.createdAt)],
            }),

            db.query.patientFiles.findMany({
                where: eq(patientFiles.patientId, patientId),
                orderBy: [desc(patientFiles.createdAt)],
            }),

            db.query.doctorPrescriptions.findMany({
                where: eq(doctorPrescriptions.patientId, patientId),
                orderBy: [desc(doctorPrescriptions.createdAt)],
                with: { items: true },
            }),

            db.query.patientAllergies.findMany({ where: eq(patientAllergies.patientId, patientId) }),
            db.query.patientConditions.findMany({ where: eq(patientConditions.patientId, patientId) }),
        ]);

        const timeline: TimelineEvent[] = [
            ...allScans.map((scanRow) => ({
                id: scanRow.id,
                type: "scan" as const,
                date: toIso(scanRow.uploadedAt),
                summary: `${scanRow.modality} scan - ${scanRow.status}`,
                record_id: scanRow.id,
            })),
            ...allReports.map((reportRow) => ({
                id: reportRow.id,
                type: "report" as const,
                date: toIso(reportRow.createdAt),
                summary: shortText(reportRow.diagnosis, "Clinical report"),
                record_id: reportRow.id,
            })),
            ...allAppointments.map((appointmentRow) => ({
                id: appointmentRow.id,
                type: "appointment" as const,
                date: toIso(appointmentRow.scheduledAt),
                summary: shortText(appointmentRow.notes, `${appointmentRow.type} appointment`),
                record_id: appointmentRow.id,
            })),
            ...allVoiceNotes.map((voiceNoteRow) => ({
                id: voiceNoteRow.id,
                type: "voice_note" as const,
                date: toIso(voiceNoteRow.createdAt),
                summary: shortText(voiceNoteRow.transcription, "Voice note"),
                record_id: voiceNoteRow.id,
            })),
            ...allMessages.map((messageRow) => ({
                id: messageRow.id,
                type: "message" as const,
                date: toIso(messageRow.createdAt),
                summary: shortText(messageRow.content, "Message"),
                record_id: messageRow.id,
            })),
            ...allNotes.map((noteRow) => ({
                id: noteRow.id,
                type: "note" as const,
                date: toIso(noteRow.createdAt),
                summary: shortText(noteRow.content, "Doctor note"),
                record_id: noteRow.id,
            })),
            ...allFiles.map((fileRow) => ({
                id: fileRow.id,
                type: "file" as const,
                date: toIso(fileRow.createdAt),
                summary: fileRow.fileName,
                record_id: fileRow.id,
            })),
            ...allDoctorPrescriptions.map((prescriptionRow) => ({
                id: prescriptionRow.id,
                type: "doctor_prescription" as const,
                date: toIso(prescriptionRow.createdAt),
                summary: prescriptionRow.title,
                record_id: prescriptionRow.id,
            })),
            ...allOcrPrescriptions.map((ocrRow) => ({
                id: ocrRow.id,
                type: "ocr_prescription" as const,
                date: toIso(ocrRow.uploadedAt),
                summary: `Scanned prescription - ${ocrRow.documentType}`,
                record_id: ocrRow.id,
            })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const alerts: string[] = [];

        if (allAllergies.length > 0) {
            alerts.push(`Allergies: ${allAllergies.map((allergy) => allergy.allergen).join(", ")}`);
        }

        const activeConditions = allConditions.filter(
            (condition) => condition.status === "Active" || condition.status === "Chronic"
        );
        if (activeConditions.length > 0) {
            alerts.push(
                `Active conditions: ${activeConditions.map((condition) => condition.condition).join(", ")}`
            );
        }

        const criticalScans = allScans.filter((scanRow) => scanRow.priority === "critical");
        if (criticalScans.length > 0) {
            alerts.push(`${criticalScans.length} critical scan(s) on record`);
        }

        return NextResponse.json({
            patient: {
                id: patient.id,
                name: patient.name,
                age: patient.age,
                gender: patient.gender,
                bloodType: patient.bloodType,
                phone: patient.phone,
                medicalHistory: patient.medicalHistory,
            },
            alerts,
            timeline,
            records: {
                scans: allScans,
                reports: allReports,
                appointments: allAppointments,
                voiceNotes: allVoiceNotes,
                messages: allMessages,
                familyMembers: allFamilyMembers,
                ocrPrescriptions: allOcrPrescriptions,
                medications: allMedications,
                medicationLogs: allMedicationLogs,
                exerciseRoutines: allExerciseRoutines,
                exerciseLogs: allExerciseLogs,
                notes: allNotes,
                files: allFiles,
                doctorPrescriptions: allDoctorPrescriptions,
                allergies: allAllergies,
                conditions: allConditions,
            },
        });
    } catch (error) {
        console.error("[GET /api/doctor/patients/[id]/dossier]", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}
