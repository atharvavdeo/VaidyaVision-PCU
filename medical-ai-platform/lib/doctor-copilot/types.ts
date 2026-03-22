export type SummaryIntent =
    | "full_brief"
    | "latest_updates"
    | "timeline"
    | "scans"
    | "reports"
    | "prescriptions"
    | "medications"
    | "appointments"
    | "notes";

export type SummaryInclude =
    | "profile"
    | "scans"
    | "reports"
    | "prescriptions"
    | "medications"
    | "appointments"
    | "cases"
    | "artifacts"
    | "notes"
    | "messages"
    | "voice_notes";

export type PatientRef = {
    id?: number;
    name?: string;
    email?: string;
    phone?: string;
    mrn?: string;
};

export type SummaryRequest = {
    patientRef: PatientRef;
    intent: SummaryIntent;
    include: SummaryInclude[];
    timeframe?: {
        from?: string;
        to?: string;
        days?: number;
    };
    askClarifyingQuestion?: boolean;
};

export type ParsedSummaryRequest = {
    request: SummaryRequest;
    parserNotes?: string;
};

export type PatientCandidate = {
    id: number;
    name: string;
    email: string;
    phone: string | null;
};

export type ResolvePatientResult =
    | {
        ok: true;
        patient: PatientCandidate;
    }
    | {
        ok: false;
        code: "NOT_FOUND";
        message: string;
    }
    | {
        ok: false;
        code: "AMBIGUOUS";
        message: string;
        candidates: PatientCandidate[];
    };

export type SummarySection = {
    title: string;
    points: string[];
};

export type PatientContext = {
    patient: Record<string, unknown>;
    scans: Record<string, unknown>[];
    reports: Record<string, unknown>[];
    prescriptions: Record<string, unknown>[];
    medications: Record<string, unknown>[];
    appointments: Record<string, unknown>[];
    cases: Record<string, unknown>[];
    artifacts: Record<string, unknown>[];
    caseReports: Record<string, unknown>[];
    notes: string[];
    messages: Record<string, unknown>[];
    voiceNotes: Record<string, unknown>[];
};

export type SummaryResult = {
    summary: string;
    sections: SummarySection[];
    risks: string[];
    pendingItems: string[];
};
