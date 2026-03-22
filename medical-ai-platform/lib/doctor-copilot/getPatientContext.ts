import { and, desc, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
    appointments,
    caseArtifacts,
    caseReports,
    cases,
    conversations,
    medications,
    messages,
    prescriptions,
    reports,
    scans,
    users,
    voiceNotes,
} from "@/lib/db/schema";
import { PatientContext, ResolvePatientResult, SummaryRequest } from "./types";

function applyTimeframe<T extends Record<string, any>>(
    items: T[],
    dateKey: keyof T,
    days?: number
): T[] {
    if (!days || days <= 0) return items;
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    return items.filter((item) => {
        const value = item[dateKey];
        if (!value) return false;
        const ts = new Date(value as any).getTime();
        return Number.isFinite(ts) && ts >= since;
    });
}

export async function resolvePatient(request: SummaryRequest): Promise<ResolvePatientResult> {
    const { patientRef } = request;

    if (patientRef.id) {
        const patient = await db.query.users.findFirst({
            where: and(eq(users.id, patientRef.id), eq(users.role, "patient")),
            columns: { id: true, name: true, email: true, phone: true },
        });
        if (!patient) {
            return { ok: false, code: "NOT_FOUND", message: "Patient not found for the provided ID." };
        }
        return { ok: true, patient };
    }

    if (patientRef.email) {
        const patient = await db.query.users.findFirst({
            where: and(eq(users.email, patientRef.email), eq(users.role, "patient")),
            columns: { id: true, name: true, email: true, phone: true },
        });
        if (!patient) {
            return { ok: false, code: "NOT_FOUND", message: "Patient not found for the provided email." };
        }
        return { ok: true, patient };
    }

    if (patientRef.phone) {
        const patient = await db.query.users.findFirst({
            where: and(eq(users.phone, patientRef.phone), eq(users.role, "patient")),
            columns: { id: true, name: true, email: true, phone: true },
        });
        if (!patient) {
            return { ok: false, code: "NOT_FOUND", message: "Patient not found for the provided phone." };
        }
        return { ok: true, patient };
    }

    if (!patientRef.name) {
        return {
            ok: false,
            code: "NOT_FOUND",
            message: "Please provide a patient name, email, or ID.",
        };
    }

    const exact = await db.query.users.findMany({
        where: and(eq(users.name, patientRef.name), eq(users.role, "patient")),
        columns: { id: true, name: true, email: true, phone: true },
        limit: 5,
    });

    if (exact.length === 1) {
        return { ok: true, patient: exact[0] };
    }

    if (exact.length > 1) {
        return {
            ok: false,
            code: "AMBIGUOUS",
            message: `I found multiple patients matching \"${patientRef.name}\". Which one do you mean?`,
            candidates: exact,
        };
    }

    const partial = await db.query.users.findMany({
        where: and(ilike(users.name, `%${patientRef.name}%`), eq(users.role, "patient")),
        columns: { id: true, name: true, email: true, phone: true },
        limit: 10,
    });

    if (partial.length === 1) {
        return { ok: true, patient: partial[0] };
    }

    if (partial.length > 1) {
        return {
            ok: false,
            code: "AMBIGUOUS",
            message: `I found multiple patients similar to \"${patientRef.name}\". Please select one.`,
            candidates: partial,
        };
    }

    return {
        ok: false,
        code: "NOT_FOUND",
        message: `No patient found for \"${patientRef.name}\".`,
    };
}

export async function getPatientContext(
    patientId: number,
    request: SummaryRequest
): Promise<PatientContext> {
    const patient = await db.query.users.findFirst({
        where: eq(users.id, patientId),
        columns: {
            id: true,
            name: true,
            email: true,
            phone: true,
            age: true,
            gender: true,
            bloodType: true,
            medicalHistory: true,
            createdAt: true,
        },
    });

    const [patientScans, patientReports, patientPrescriptions, patientMeds, patientAppointments, patientCases, patientConversations] = await Promise.all([
        db.query.scans.findMany({
            where: eq(scans.patientId, patientId),
            orderBy: [desc(scans.uploadedAt)],
            limit: 12,
        }),
        db.query.reports.findMany({
            where: eq(reports.patientId, patientId),
            orderBy: [desc(reports.createdAt)],
            limit: 12,
        }),
        db.query.prescriptions.findMany({
            where: eq(prescriptions.patientId, patientId),
            orderBy: [desc(prescriptions.uploadedAt)],
            limit: 12,
        }),
        db.query.medications.findMany({
            where: and(eq(medications.patientId, patientId), eq(medications.isActive, true)),
            orderBy: [desc(medications.updatedAt)],
            limit: 20,
        }),
        db.query.appointments.findMany({
            where: eq(appointments.patientId, patientId),
            orderBy: [desc(appointments.scheduledAt)],
            limit: 12,
        }),
        db.query.cases.findMany({
            where: eq(cases.patientId, patientId),
            orderBy: [desc(cases.updatedAt)],
            limit: 8,
        }),
        db.query.conversations.findMany({
            where: eq(conversations.patientId, patientId),
            orderBy: [desc(conversations.lastMessageAt)],
            limit: 6,
        }),
    ]);

    const caseIds = patientCases.map((c) => c.id);
    const scanIds = patientScans.map((s) => s.id);
    const conversationIds = patientConversations.map((c) => c.id);

    const [artifacts, linkedCaseReports, recentMessages, recentVoiceNotes] = await Promise.all([
        caseIds.length
            ? db.query.caseArtifacts.findMany({
                where: inArray(caseArtifacts.caseId, caseIds),
                orderBy: [desc(caseArtifacts.createdAt)],
                limit: 20,
            })
            : Promise.resolve([] as any[]),
        caseIds.length
            ? db.query.caseReports.findMany({
                where: inArray(caseReports.caseId, caseIds),
                orderBy: [desc(caseReports.updatedAt)],
                limit: 12,
            })
            : Promise.resolve([] as any[]),
        conversationIds.length
            ? db.query.messages.findMany({
                where: inArray(messages.conversationId, conversationIds),
                orderBy: [desc(messages.createdAt)],
                limit: 20,
            })
            : Promise.resolve([] as any[]),
        scanIds.length
            ? db.query.voiceNotes.findMany({
                where: inArray(voiceNotes.scanId, scanIds),
                orderBy: [desc(voiceNotes.createdAt)],
                limit: 12,
            })
            : Promise.resolve([] as any[]),
    ]);

    const days = request.timeframe?.days;

    const scansInRange = applyTimeframe(patientScans, "uploadedAt", days);
    const reportsInRange = applyTimeframe(patientReports, "createdAt", days);
    const prescriptionsInRange = applyTimeframe(patientPrescriptions, "uploadedAt", days);
    const medsInRange = applyTimeframe(patientMeds, "updatedAt", days);
    const appointmentsInRange = applyTimeframe(patientAppointments, "scheduledAt", days);
    const casesInRange = applyTimeframe(patientCases, "updatedAt", days);
    const artifactsInRange = applyTimeframe(artifacts, "createdAt", days);
    const caseReportsInRange = applyTimeframe(linkedCaseReports, "updatedAt", days);
    const messagesInRange = applyTimeframe(recentMessages, "createdAt", days);
    const voiceNotesInRange = applyTimeframe(recentVoiceNotes, "createdAt", days);

    const noteCandidates: string[] = [];

    for (const s of scansInRange) {
        if (s.doctorNotes) noteCandidates.push(`Scan #${s.id}: ${s.doctorNotes}`);
    }

    for (const r of reportsInRange) {
        if (r.diagnosis) noteCandidates.push(`Report #${r.id} diagnosis: ${r.diagnosis}`);
        if (r.findings) noteCandidates.push(`Report #${r.id} findings: ${r.findings}`);
        if (r.recommendations) noteCandidates.push(`Report #${r.id} recommendations: ${r.recommendations}`);
    }

    for (const c of casesInRange) {
        if (c.internalSummary) noteCandidates.push(`Case #${c.id}: ${c.internalSummary}`);
    }

    for (const cr of caseReportsInRange) {
        if (cr.patientSummary) noteCandidates.push(`Case report #${cr.id}: ${cr.patientSummary}`);
        if (cr.contentJson) noteCandidates.push(`Case report #${cr.id} has structured content.`);
    }

    return {
        patient: patient || {},
        scans: scansInRange,
        reports: reportsInRange,
        prescriptions: prescriptionsInRange,
        medications: medsInRange,
        appointments: appointmentsInRange,
        cases: casesInRange,
        artifacts: artifactsInRange,
        caseReports: caseReportsInRange,
        notes: noteCandidates.slice(0, 24),
        messages: messagesInRange,
        voiceNotes: voiceNotesInRange,
    };
}
