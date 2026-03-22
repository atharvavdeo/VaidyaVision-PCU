import { db } from "@/lib/db";
import {
    reports, scans, users, doctorProfiles, medications,
    appointments, hospitals, hospitalReportTemplates,
} from "@/lib/db/schema";
import { eq, desc, gte, and } from "drizzle-orm";

// ── Types ──

export interface ReportPayload {
    hospital: HospitalBlock | null;
    patient: PatientBlock;
    doctor: DoctorBlock;
    scan: ScanBlock;
    report: ReportBlock;
    medications: MedicationEntry[];
    history: HistoryEntry[];
    template: TemplateBlock | null;
}

interface HospitalBlock {
    id: number;
    name: string;
    logoUrl: string | null;
    headerImageUrl: string | null;
    footerImageUrl: string | null;
    address: string;
    city: string | null;
    state: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
}

interface PatientBlock {
    id: number;
    name: string;
    email: string;
    age: number | null;
    gender: string | null;
    bloodType: string | null;
    phone: string | null;
}

interface DoctorBlock {
    id: number;
    name: string;
    email: string;
    specialty: string;
    degree: string;
    licenseNumber: string | null;
    experience: number | null;
}

interface ScanBlock {
    id: number;
    modality: string;
    aiDiagnosis: string | null;
    aiConfidence: number | null;
    symptoms: string | null;
    heatmapUrl: string | null;
    imageUrl: string;
    uploadedAt: Date;
}

interface ReportBlock {
    id: number;
    diagnosis: string;
    findings: string;
    recommendations: string | null;
    severity: string;
    status: string;
    language: string;
    createdAt: Date;
    signedAt: Date | null;
    releasedAt: Date | null;
}

interface MedicationEntry {
    drugName: string;
    dosage: string | null;
    frequency: string | null;
    form: string | null;
    instructions: string | null;
}

export interface HistoryEntry {
    type: "scan" | "report" | "appointment";
    date: Date;
    label: string;
    detail: string | null;
}

interface TemplateBlock {
    id: number;
    name: string;
    slotConfig: Record<string, { show: boolean; label: string }>;
    signatureConfig: Record<string, unknown>;
    disclaimerText: string | null;
    logoUrl: string | null;
    headerImageUrl: string | null;
    footerImageUrl: string | null;
}

// ── Builder ──

export async function buildReportPayload(reportId: number): Promise<ReportPayload> {
    // 1. Load report as the root anchor
    const report = await db.query.reports.findFirst({
        where: eq(reports.id, reportId),
        with: {
            scan: true,
            patient: true,
            doctor: {
                with: { doctorProfile: true },
            },
        },
    });

    if (!report) throw new Error(`Report #${reportId} not found`);
    if (!report.scan) throw new Error(`Report #${reportId} has no linked scan`);

    // 2. Resolve hospital via doctor.hospitalId
    let hospitalBlock: HospitalBlock | null = null;
    const doctorUser = report.doctor;
    if (doctorUser?.hospitalId) {
        const hosp = await db.query.hospitals.findFirst({
            where: eq(hospitals.id, doctorUser.hospitalId),
        });
        if (hosp) {
            hospitalBlock = {
                id: hosp.id,
                name: hosp.name,
                logoUrl: hosp.logoUrl,
                headerImageUrl: hosp.reportHeaderUrl,
                footerImageUrl: hosp.reportFooterUrl,
                address: [hosp.addressLine1, hosp.addressLine2, hosp.locality].filter(Boolean).join(", "),
                city: hosp.city,
                state: hosp.state,
                phone: hosp.phone,
                email: hosp.email,
                website: hosp.website,
            };
        }
    }

    // 3. Resolve template: explicit hospitalTemplateId → hospital default → null
    let templateBlock: TemplateBlock | null = null;
    let tmpl = null;

    if (report.hospitalTemplateId) {
        tmpl = await db.query.hospitalReportTemplates.findFirst({
            where: eq(hospitalReportTemplates.id, report.hospitalTemplateId),
        });
    }

    if (!tmpl && doctorUser?.hospitalId) {
        tmpl = await db.query.hospitalReportTemplates.findFirst({
            where: and(
                eq(hospitalReportTemplates.hospitalId, doctorUser.hospitalId),
                eq(hospitalReportTemplates.isDefault, true),
            ),
        });
    }

    if (tmpl) {
        // Neon jsonb columns automatically return nested JS Objects through Drizzle, so parsing isn't needed anymore explicitly natively passing AST checks directly.
        templateBlock = {
            id: tmpl.id,
            name: tmpl.name,
            slotConfig: (tmpl.sectionSchemaJson as any) || {},
            signatureConfig: (tmpl.signatureConfigJson as any) || {},
            disclaimerText: tmpl.disclaimerText,
            logoUrl: tmpl.logoUrl,
            headerImageUrl: tmpl.headerImageUrl,
            footerImageUrl: tmpl.footerImageUrl,
        };
    }

    // 4. Doctor profile
    const profile = (doctorUser as any)?.doctorProfile;

    // 5. Active medications for patient
    const meds = await db.query.medications.findMany({
        where: and(
            eq(medications.patientId, report.patientId),
            eq(medications.isActive, true),
        ),
    });

    // 6. History: last 180 days of scans, reports, appointments
    const cutoff = new Date(Date.now() - 180 * 86400000);

    const [pastScans, pastReports, pastAppointments] = await Promise.all([
        db.query.scans.findMany({
            where: and(
                eq(scans.patientId, report.patientId),
                gte(scans.uploadedAt, cutoff),
            ),
            orderBy: [desc(scans.uploadedAt)],
            limit: 10,
        }),
        db.query.reports.findMany({
            where: and(
                eq(reports.patientId, report.patientId),
                gte(reports.createdAt, cutoff),
            ),
            orderBy: [desc(reports.createdAt)],
            limit: 10,
        }),
        db.query.appointments.findMany({
            where: and(
                eq(appointments.patientId, report.patientId),
                gte(appointments.scheduledAt, cutoff),
            ),
            orderBy: [desc(appointments.scheduledAt)],
            limit: 10,
        }),
    ]);

    const history: HistoryEntry[] = [
        ...pastScans.map(s => ({
            type: "scan" as const,
            date: s.uploadedAt,
            label: `${s.modality.toUpperCase()} Scan`,
            detail: s.aiDiagnosis || s.status,
        })),
        ...pastReports
            .filter(r => r.id !== reportId)
            .map(r => ({
                type: "report" as const,
                date: r.createdAt,
                label: `Report — ${r.severity}`,
                detail: r.diagnosis,
            })),
        ...pastAppointments.map(a => ({
            type: "appointment" as const,
            date: a.scheduledAt,
            label: `${a.type.replace("_", " ")} Appointment`,
            detail: a.notes,
        })),
    ]
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10);

    return {
        hospital: hospitalBlock,
        patient: {
            id: report.patient.id,
            name: report.patient.name,
            email: report.patient.email,
            age: report.patient.age,
            gender: report.patient.gender,
            bloodType: report.patient.bloodType,
            phone: report.patient.phone,
        },
        doctor: {
            id: doctorUser.id,
            name: doctorUser.name,
            email: doctorUser.email,
            specialty: profile?.specialty || doctorUser.specialty || "General Medicine",
            degree: profile?.degree || "MBBS",
            licenseNumber: profile?.licenseNumber || null,
            experience: profile?.experience || null,
        },
        scan: {
            id: report.scan.id,
            modality: report.scan.modality,
            aiDiagnosis: report.scan.aiDiagnosis,
            aiConfidence: report.scan.aiConfidence,
            symptoms: report.scan.symptoms,
            heatmapUrl: report.scan.heatmapUrl,
            imageUrl: report.scan.imageUrl,
            uploadedAt: report.scan.uploadedAt,
        },
        report: {
            id: report.id,
            diagnosis: report.diagnosis,
            findings: report.findings,
            recommendations: report.recommendations,
            severity: report.severity,
            status: report.status,
            language: report.language,
            createdAt: report.createdAt,
            signedAt: report.signedAt,
            releasedAt: report.releasedAt,
        },
        medications: meds.map(m => ({
            drugName: m.drugName,
            dosage: m.dosage,
            frequency: m.frequency,
            form: m.form,
            instructions: m.instructions,
        })),
        history,
        template: templateBlock,
    };
}
