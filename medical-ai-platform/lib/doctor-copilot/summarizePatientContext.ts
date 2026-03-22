import { PatientContext, SummaryRequest, SummaryResult } from "./types";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function asText(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function short(value: unknown, max = 180): string {
    const text = asText(value).replace(/\s+/g, " ");
    if (!text) return "";
    if (text.length <= max) return text;
    return `${text.slice(0, max - 1)}...`;
}

function fmtDate(value: unknown): string {
    if (!value) return "unknown date";
    const d = new Date(String(value));
    if (!Number.isFinite(d.getTime())) return String(value);
    return d.toISOString().slice(0, 10);
}

function buildClinicalDigest(context: PatientContext) {
    const scans = context.scans.slice(0, 8).map((s) => ({
        id: asText(s.id),
        modality: asText(s.modality) || "unknown",
        status: asText(s.status) || "unknown",
        priority: asText(s.priority) || "unknown",
        uploadedAt: fmtDate(s.uploadedAt),
        aiDiagnosis: short(s.aiDiagnosis, 120),
        aiConfidence: s.aiConfidence,
        doctorNotes: short(s.doctorNotes, 140),
    }));

    const reports = context.reports.slice(0, 8).map((r) => ({
        id: asText(r.id),
        diagnosis: short(r.diagnosis, 120),
        severity: asText(r.severity) || "unknown",
        status: asText(r.status) || "unknown",
        createdAt: fmtDate(r.createdAt),
        findings: short(r.findings, 160),
        recommendations: short(r.recommendations, 140),
    }));

    const medications = context.medications.slice(0, 12).map((m) => ({
        drugName: asText(m.drugName) || "unknown",
        dosage: asText(m.dosage),
        frequency: asText(m.frequency),
        duration: asText(m.duration),
        startDate: asText(m.startDate),
        endDate: asText(m.endDate),
        instructions: short(m.instructions, 120),
        active: Boolean(m.isActive),
    }));

    const prescriptions = context.prescriptions.slice(0, 8).map((p) => ({
        id: asText(p.id),
        documentType: asText(p.documentType) || "prescription",
        uploadedAt: fmtDate(p.uploadedAt),
        prescribingDoctor: asText(p.prescribingDoctor),
        prescriptionDate: asText(p.prescriptionDate),
        ocrConfidence: p.ocrConfidence,
        cleanedText: short(p.cleanedText, 160),
    }));

    const appointments = context.appointments.slice(0, 10).map((a) => ({
        id: asText(a.id),
        scheduledAt: fmtDate(a.scheduledAt),
        type: asText(a.type) || "follow_up",
        status: asText(a.status) || "unknown",
        notes: short(a.notes, 140),
    }));

    const cases = context.cases.slice(0, 8).map((c) => ({
        id: asText(c.id),
        title: short(c.title, 100),
        status: asText(c.status) || "unknown",
        presentingComplaint: short(c.presentingComplaint, 120),
        internalSummary: short(c.internalSummary, 140),
        updatedAt: fmtDate(c.updatedAt),
    }));

    const messageHighlights = context.messages
        .slice(0, 8)
        .map((m) => `${fmtDate(m.createdAt)}: ${short(m.content, 120)}`)
        .filter(Boolean);

    const voiceNoteHighlights = context.voiceNotes
        .slice(0, 6)
        .map((v) => `${fmtDate(v.createdAt)}: ${short(v.transcription, 120)}`)
        .filter(Boolean);

    return {
        patientProfile: {
            name: asText(context.patient?.name),
            email: asText(context.patient?.email),
            age: context.patient?.age,
            gender: asText(context.patient?.gender),
            bloodType: asText(context.patient?.bloodType),
            medicalHistory: short(context.patient?.medicalHistory, 160),
        },
        scans,
        reports,
        medications,
        prescriptions,
        appointments,
        cases,
        notes: context.notes.slice(0, 16),
        messageHighlights,
        voiceNoteHighlights,
    };
}

function buildDeterministicSections(context: PatientContext): SummaryResult {
    const patientName = asText(context.patient?.name) || "Unknown patient";
    const criticalReports = context.reports.filter(
        (r) => asText(r.severity).toLowerCase() === "critical"
    );
    const highPriorityScans = context.scans.filter(
        (s) => ["high", "critical"].includes(asText(s.priority).toLowerCase())
    );

    const sections = [
        {
            title: "Patient Overview",
            points: [
                `${patientName}${asText(context.patient?.age) ? `, age ${asText(context.patient?.age)}` : ""}${asText(context.patient?.gender) ? `, ${asText(context.patient?.gender)}` : ""}`,
                asText(context.patient?.email) ? `Email: ${asText(context.patient?.email)}` : "Email not available",
                asText(context.patient?.medicalHistory)
                    ? `History: ${short(context.patient?.medicalHistory, 130)}`
                    : "Medical history not documented",
            ],
        },
        {
            title: "Latest Updates",
            points: [
                ...context.reports.slice(0, 3).map((r) =>
                    `Report ${asText(r.id)} (${fmtDate(r.createdAt)}): ${short(r.diagnosis, 100)} [${asText(r.severity) || "unknown"}]`
                ),
                ...context.scans.slice(0, 2).map((s) =>
                    `Scan ${asText(s.id)} (${fmtDate(s.uploadedAt)}): ${asText(s.modality) || "unknown"}, ${asText(s.status) || "unknown"}${asText(s.aiDiagnosis) ? `, AI: ${short(s.aiDiagnosis, 70)}` : ""}`
                ),
            ].filter(Boolean),
        },
        {
            title: "Recent Scans and Reports",
            points: [
                ...context.reports.slice(0, 4).map((r) =>
                    `${fmtDate(r.createdAt)} | Dx: ${short(r.diagnosis, 90)} | Findings: ${short(r.findings, 90)}`
                ),
                ...context.scans.slice(0, 4).map((s) =>
                    `${fmtDate(s.uploadedAt)} | ${asText(s.modality) || "unknown"} | priority ${asText(s.priority) || "unknown"}${asText(s.doctorNotes) ? ` | note: ${short(s.doctorNotes, 70)}` : ""}`
                ),
            ].filter(Boolean),
        },
        {
            title: "Medications and Prescriptions",
            points: [
                ...context.medications.slice(0, 6).map((m) =>
                    `${asText(m.drugName) || "Unknown drug"}${asText(m.dosage) ? ` ${asText(m.dosage)}` : ""}${asText(m.frequency) ? `, ${asText(m.frequency)}` : ""}${asText(m.duration) ? `, ${asText(m.duration)}` : ""}`
                ),
                ...context.prescriptions.slice(0, 3).map((p) =>
                    `Prescription ${asText(p.id)} (${fmtDate(p.uploadedAt)}): ${asText(p.documentType) || "prescription"}${asText(p.prescribingDoctor) ? ` by ${asText(p.prescribingDoctor)}` : ""}`
                ),
            ].filter(Boolean),
        },
        {
            title: "Appointments and Follow-ups",
            points: context.appointments.slice(0, 6).map((a) =>
                `${fmtDate(a.scheduledAt)} | ${asText(a.type) || "follow_up"} | ${asText(a.status) || "unknown"}${asText(a.notes) ? ` | ${short(a.notes, 80)}` : ""}`
            ),
        },
        {
            title: "Doctor Notes / Clinical Notes",
            points: [
                ...context.notes.slice(0, 8),
                ...context.voiceNotes.slice(0, 3).map((v) => `Voice note ${asText(v.id)}: ${short(v.transcription, 110)}`),
            ],
        },
        {
            title: "Risks / Pending Attention Items",
            points: [
                ...criticalReports.slice(0, 3).map((r) => `Critical report ${asText(r.id)} (${fmtDate(r.createdAt)}): ${short(r.diagnosis, 90)}`),
                ...highPriorityScans.slice(0, 3).map((s) => `High-priority scan ${asText(s.id)} (${fmtDate(s.uploadedAt)}): ${asText(s.modality) || "unknown"}`),
                ...context.appointments
                    .filter((a) => asText(a.status).toLowerCase() === "scheduled")
                    .slice(0, 3)
                    .map((a) => `Scheduled follow-up pending on ${fmtDate(a.scheduledAt)} (${asText(a.type) || "follow_up"})`),
            ],
        },
    ].map((section) => ({
        ...section,
        points: section.points.length > 0 ? section.points : ["No data available in this category for the selected patient/timeframe."],
    }));

    const risks = [
        ...criticalReports.slice(0, 4).map((r) => `Critical severity report ${asText(r.id)} requires immediate attention.`),
        ...highPriorityScans.slice(0, 4).map((s) => `Scan ${asText(s.id)} is marked ${asText(s.priority)} priority.`),
    ];

    const pendingItems = context.appointments
        .filter((a) => asText(a.status).toLowerCase() === "scheduled")
        .slice(0, 6)
        .map((a) => `Appointment ${asText(a.id)} on ${fmtDate(a.scheduledAt)} is still scheduled.`);

    return {
        summary: `${patientName}: ${context.reports.length} reports, ${context.scans.length} scans, ${context.medications.length} active medications, ${context.appointments.length} appointments in scope.`,
        sections,
        risks,
        pendingItems,
    };
}

function fallbackSummary(context: PatientContext, request: SummaryRequest): SummaryResult {
    const deterministic = buildDeterministicSections(context);
    const patientName = String(context.patient?.name || "Unknown patient");
    const lines: string[] = [];

    lines.push(`${patientName} summary (${request.intent.replace("_", " ")}):`);
    lines.push(`Scans: ${context.scans.length}, Reports: ${context.reports.length}, Prescriptions: ${context.prescriptions.length}`);
    lines.push(`Medications: ${context.medications.length}, Appointments: ${context.appointments.length}`);

    if (context.reports[0]?.diagnosis) {
        lines.push(`Latest diagnosis: ${String(context.reports[0].diagnosis)}`);
    }

    if (context.notes.length > 0) {
        lines.push(`Clinical notes: ${context.notes.slice(0, 2).join(" | ")}`);
    }

    return {
        summary: lines.join("\n"),
        sections: deterministic.sections,
        risks: deterministic.risks,
        pendingItems: deterministic.pendingItems,
    };
}

function safeJsonParse(text: string): SummaryResult | null {
    try {
        return JSON.parse(text);
    } catch {
        const first = text.indexOf("{");
        const last = text.lastIndexOf("}");
        if (first !== -1 && last !== -1 && last > first) {
            try {
                return JSON.parse(text.slice(first, last + 1));
            } catch {
                return null;
            }
        }
        return null;
    }
}

export async function summarizePatientContext(
    request: SummaryRequest,
    context: PatientContext
): Promise<SummaryResult> {
    const deterministic = buildDeterministicSections(context);

    if (!GROQ_API_KEY) {
        return fallbackSummary(context, request);
    }

    const digest = buildClinicalDigest(context);

    const compactContext = {
        patient: context.patient,
        digest,
        scans: context.scans.slice(0, 8),
        reports: context.reports.slice(0, 8),
        prescriptions: context.prescriptions.slice(0, 8),
        medications: context.medications.slice(0, 12),
        appointments: context.appointments.slice(0, 10),
        cases: context.cases.slice(0, 8),
        caseReports: context.caseReports.slice(0, 6),
        notes: context.notes.slice(0, 16),
        messages: context.messages.slice(0, 12),
        voiceNotes: context.voiceNotes.slice(0, 8),
    };

    const systemPrompt = `You are a doctor-facing medical summary copilot.
Rules:
- Use only provided context. Do not invent data.
- Be concise and specific, but not generic.
- Include all relevant available details in the appropriate section as bullet points.
- Each bullet MUST include at least one concrete clinical/detail token: medication name, diagnosis, severity, date, status, finding, recommendation, or appointment type.
- Never output count-only bullets like "4 scans in scope" unless there are absolutely no other details.
- Keep each bullet under 34 words.
- If category has no data, say that clearly.
- Return ONLY JSON in this shape:
{
  "summary": string,
  "sections": [{"title": string, "points": string[]}],
  "risks": string[],
  "pendingItems": string[]
}
Required section titles:
1) Patient Overview
2) Latest Updates
3) Recent Scans and Reports
4) Medications and Prescriptions
5) Appointments and Follow-ups
6) Doctor Notes / Clinical Notes
7) Risks / Pending Attention Items
- If a section has data, provide at least 2 bullets in that section.`;

    const userPrompt = JSON.stringify({ request, context: compactContext });

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            temperature: 0.2,
            max_tokens: 1100,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
        }),
    });

    if (!res.ok) {
        return fallbackSummary(context, request);
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse(content);

    if (!parsed || typeof parsed.summary !== "string" || !Array.isArray(parsed.sections)) {
        return fallbackSummary(context, request);
    }

    const weakSectionCount = parsed.sections.filter((section) => {
        if (!Array.isArray(section?.points) || section.points.length === 0) return true;
        const joined = section.points.join(" ").toLowerCase();
        return /(in scope|records|entries)/.test(joined) && !/(diagnosis|severity|med|appointment|scan|report|date|finding|recommend)/.test(joined);
    }).length;

    if (weakSectionCount >= 3) {
        return {
            summary: parsed.summary || deterministic.summary,
            sections: deterministic.sections,
            risks: parsed.risks?.length ? parsed.risks : deterministic.risks,
            pendingItems: parsed.pendingItems?.length ? parsed.pendingItems : deterministic.pendingItems,
        };
    }

    return parsed;
}
