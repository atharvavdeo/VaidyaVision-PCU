"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    Activity,
    AlertTriangle,
    Calendar,
    Clock,
    File,
    FileImage,
    FileText,
    MessageSquare,
    Mic,
    Pill,
    Plus,
    Save,
    Upload,
    User,
    X,
} from "lucide-react";

type DossierPatient = {
    id: number;
    name: string;
    age: number | null;
    gender: string | null;
    bloodType: string | null;
    phone: string | null;
    medicalHistory: string | null;
};

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

type ScanRecord = {
    id: number;
    modality: string;
    status: string;
    priority: string;
    uploadedAt: string;
};

type ReportRecord = {
    id: number;
    diagnosis: string;
    severity: string;
    createdAt: string;
};

type AppointmentRecord = {
    id: number;
    scheduledAt: string;
    type: string;
    status: string;
    notes: string | null;
};

type VoiceNoteRecord = {
    id: number;
    createdAt: string | null;
    transcription: string;
    audioUrl: string | null;
};

type MessageRecord = {
    id: number;
    content: string;
    senderId: number;
    createdAt: string;
};

type FamilyMemberRecord = {
    id: number;
    relation: string;
    name: string;
};

type OcrPrescriptionRecord = {
    id: number;
    documentType: string;
    uploadedAt: string;
    ocrConfidence: number | null;
    imageUrl: string;
    cleanedText: string | null;
};

type MedicationRecord = {
    id: number;
    drugName: string;
    dosage: string | null;
    form: string | null;
    frequency: string | null;
    isActive: boolean;
    addedBy: string;
};

type MedicationLogRecord = { id: number };

type ExerciseRoutineRecord = {
    id: number;
    name: string;
    type: string;
    frequency: string | null;
    isActive: boolean;
    addedBy: string;
};

type ExerciseLogRecord = { id: number };

type NoteRecord = {
    id: number;
    content: string;
    doctorId: number;
    createdAt: string;
    linkedToType: string | null;
    linkedToId: number | null;
};

type FileRecord = {
    id: number;
    fileName: string;
    fileType: string | null;
    fileSize: number | null;
    fileUrl: string;
    createdAt: string;
};

type DoctorPrescriptionItem = {
    id: number;
    medicineName: string;
    dosage: string | null;
    frequency: string | null;
    duration: string | null;
    directions: string | null;
    isActive: boolean;
};

type DoctorPrescriptionRecord = {
    id: number;
    title: string;
    notes: string | null;
    createdAt: string;
    items: DoctorPrescriptionItem[];
};

type AllergyRecord = {
    id: number;
    allergen: string;
    severity: string | null;
    notes: string | null;
};

type ConditionRecord = {
    id: number;
    condition: string;
    status: string | null;
    diagnosedAt: string | null;
    notes: string | null;
};

type DossierRecords = {
    scans: ScanRecord[];
    reports: ReportRecord[];
    appointments: AppointmentRecord[];
    voiceNotes: VoiceNoteRecord[];
    messages: MessageRecord[];
    familyMembers: FamilyMemberRecord[];
    ocrPrescriptions: OcrPrescriptionRecord[];
    medications: MedicationRecord[];
    medicationLogs: MedicationLogRecord[];
    exerciseRoutines: ExerciseRoutineRecord[];
    exerciseLogs: ExerciseLogRecord[];
    notes: NoteRecord[];
    files: FileRecord[];
    doctorPrescriptions: DoctorPrescriptionRecord[];
    allergies: AllergyRecord[];
    conditions: ConditionRecord[];
};

type DossierResponse = {
    patient: DossierPatient;
    alerts: string[];
    timeline: TimelineEvent[];
    records: DossierRecords;
};

type TimelineFilter = "All" | "Clinical" | "Files" | "Communication" | "Medications";

type NoteForm = {
    content: string;
    linkedToType: "" | "scan" | "report" | "appointment";
    linkedToId: string;
};

type PrescriptionFormItem = {
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    directions: string;
};

type PrescriptionForm = {
    title: string;
    notes: string;
    items: PrescriptionFormItem[];
};

const FILTER_MAP: Record<TimelineFilter, TimelineType[]> = {
    All: ["scan", "report", "appointment", "note", "file", "doctor_prescription", "ocr_prescription", "message", "voice_note"],
    Clinical: ["scan", "report", "appointment", "note", "voice_note"],
    Files: ["file", "ocr_prescription"],
    Communication: ["message"],
    Medications: ["doctor_prescription"],
};

function formatDate(value: string | null | undefined): string {
    if (!value) return "Unknown";
    return new Date(value).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatDateTime(value: string | null | undefined): string {
    if (!value) return "Unknown";
    return new Date(value).toLocaleString();
}

function short(value: string | null | undefined, max = 120): string {
    if (!value) return "";
    return value.length > max ? `${value.slice(0, max)}...` : value;
}

function humanSize(bytes: number | null): string {
    if (!bytes) return "-";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function eventIcon(type: TimelineType) {
    const classes = "w-4 h-4";
    if (type === "scan") return <Activity className={classes} />;
    if (type === "report") return <FileText className={classes} />;
    if (type === "appointment") return <Calendar className={classes} />;
    if (type === "note") return <FileText className={classes} />;
    if (type === "file") return <File className={classes} />;
    if (type === "doctor_prescription") return <Pill className={classes} />;
    if (type === "ocr_prescription") return <FileImage className={classes} />;
    if (type === "message") return <MessageSquare className={classes} />;
    return <Mic className={classes} />;
}

const emptyRecords: DossierRecords = {
    scans: [],
    reports: [],
    appointments: [],
    voiceNotes: [],
    messages: [],
    familyMembers: [],
    ocrPrescriptions: [],
    medications: [],
    medicationLogs: [],
    exerciseRoutines: [],
    exerciseLogs: [],
    notes: [],
    files: [],
    doctorPrescriptions: [],
    allergies: [],
    conditions: [],
};

type RecordDropdownProps = {
    title: string;
    count: number;
    children: ReactNode;
};

function RecordDropdown({ title, count, children }: RecordDropdownProps) {
    return (
        <details className="rounded-2xl border border-sage-200 bg-cream-50 open:bg-white transition-colors">
            <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between">
                <span className="font-semibold text-olive-900">{title}</span>
                <span className="text-xs font-semibold text-olive-700 bg-sage-100 px-2 py-1 rounded-full">{count}</span>
            </summary>
            <div className="px-4 pb-4">{children}</div>
        </details>
    );
}

export default function PatientDossierPage() {
    const params = useParams<{ id: string }>();
    const patientId = params?.id;

    const [loading, setLoading] = useState(true);
    const [errorCode, setErrorCode] = useState<number | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [data, setData] = useState<DossierResponse | null>(null);

    const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>("All");

    const [showNoteModal, setShowNoteModal] = useState(false);
    const [editingNote, setEditingNote] = useState<NoteRecord | null>(null);
    const [noteForm, setNoteForm] = useState<NoteForm>({ content: "", linkedToType: "", linkedToId: "" });
    const [noteLoading, setNoteLoading] = useState(false);
    const [noteError, setNoteError] = useState<string | null>(null);

    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
    const [linkTypeForFile, setLinkTypeForFile] = useState<"" | "scan" | "report" | "appointment">("");
    const [linkIdForFile, setLinkIdForFile] = useState("");

    const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
    const [editingPrescription, setEditingPrescription] = useState<DoctorPrescriptionRecord | null>(null);
    const [prescriptionForm, setPrescriptionForm] = useState<PrescriptionForm>({
        title: "",
        notes: "",
        items: [{ medicineName: "", dosage: "", frequency: "", duration: "", directions: "" }],
    });
    const [prescriptionLoading, setPrescriptionLoading] = useState(false);
    const [prescriptionError, setPrescriptionError] = useState<string | null>(null);

    const [expandedMedicalHistory, setExpandedMedicalHistory] = useState(false);

    const records = data?.records ?? emptyRecords;

    const filteredTimeline = useMemo(
        () => (data?.timeline ?? []).filter((event) => FILTER_MAP[timelineFilter].includes(event.type)),
        [data?.timeline, timelineFilter]
    );

    async function fetchDossier() {
        if (!patientId) return;
        setLoading(true);
        setErrorCode(null);
        setErrorMessage(null);

        try {
            const res = await fetch(`/api/doctor/patients/${patientId}/dossier`, { cache: "no-store" });
            const body = await res.json();
            if (!res.ok) {
                setErrorCode(res.status);
                setErrorMessage(body?.error || "Something went wrong.");
                return;
            }
            setData(body as DossierResponse);
        } catch {
            setErrorCode(500);
            setErrorMessage("Something went wrong.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchDossier();
    }, [patientId]);

    function openAddNote() {
        setEditingNote(null);
        setNoteError(null);
        setNoteForm({ content: "", linkedToType: "", linkedToId: "" });
        setShowNoteModal(true);
    }

    function openEditNote(note: NoteRecord) {
        setEditingNote(note);
        setNoteError(null);
        setNoteForm({
            content: note.content,
            linkedToType: (note.linkedToType as "scan" | "report" | "appointment" | "") || "",
            linkedToId: note.linkedToId ? String(note.linkedToId) : "",
        });
        setShowNoteModal(true);
    }

    async function submitNote() {
        if (!patientId) return;
        setNoteLoading(true);
        setNoteError(null);

        try {
            const payload = {
                content: noteForm.content,
                linkedToType: noteForm.linkedToType || undefined,
                linkedToId: noteForm.linkedToId ? Number.parseInt(noteForm.linkedToId, 10) : undefined,
            };

            const res = await fetch(
                editingNote
                    ? `/api/doctor/patients/${patientId}/notes/${editingNote.id}`
                    : `/api/doctor/patients/${patientId}/notes`,
                {
                    method: editingNote ? "PATCH" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                }
            );

            const body = await res.json();
            if (!res.ok) {
                setNoteError(body?.error || "Failed to save note");
                return;
            }

            setData((prev) => {
                if (!prev) return prev;
                const updatedNotes = editingNote
                    ? prev.records.notes.map((n) => (n.id === body.id ? body : n))
                    : [body, ...prev.records.notes];
                return {
                    ...prev,
                    records: { ...prev.records, notes: updatedNotes },
                };
            });

            setShowNoteModal(false);
        } catch {
            setNoteError("Failed to save note");
        } finally {
            setNoteLoading(false);
        }
    }

    async function uploadFile(file: File) {
        if (!patientId) return;
        setUploadingFile(true);
        setUploadError(null);
        setUploadProgressText("Uploading file...");

        try {
            const form = new FormData();
            form.append("file", file);
            if (linkTypeForFile) form.append("linkedToType", linkTypeForFile);
            if (linkIdForFile) form.append("linkedToId", linkIdForFile);

            const res = await fetch(`/api/doctor/patients/${patientId}/files`, {
                method: "POST",
                body: form,
            });

            const body = await res.json();
            if (!res.ok) {
                setUploadError(body?.error || "Upload failed");
                return;
            }

            setData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    records: { ...prev.records, files: [body, ...prev.records.files] },
                };
            });

            setUploadProgressText("Upload complete");
            setLinkTypeForFile("");
            setLinkIdForFile("");
        } catch {
            setUploadError("Upload failed");
        } finally {
            setUploadingFile(false);
            setTimeout(() => setUploadProgressText(null), 1200);
        }
    }

    function openNewPrescription() {
        setEditingPrescription(null);
        setPrescriptionError(null);
        setPrescriptionForm({
            title: "",
            notes: "",
            items: [{ medicineName: "", dosage: "", frequency: "", duration: "", directions: "" }],
        });
        setShowPrescriptionModal(true);
    }

    function openEditPrescription(prescription: DoctorPrescriptionRecord) {
        setEditingPrescription(prescription);
        setPrescriptionError(null);
        setPrescriptionForm({
            title: prescription.title,
            notes: prescription.notes || "",
            items:
                prescription.items.length > 0
                    ? prescription.items.map((item) => ({
                        medicineName: item.medicineName,
                        dosage: item.dosage || "",
                        frequency: item.frequency || "",
                        duration: item.duration || "",
                        directions: item.directions || "",
                    }))
                    : [{ medicineName: "", dosage: "", frequency: "", duration: "", directions: "" }],
        });
        setShowPrescriptionModal(true);
    }

    async function submitPrescription() {
        if (!patientId) return;
        setPrescriptionLoading(true);
        setPrescriptionError(null);

        try {
            const payload = {
                title: prescriptionForm.title,
                notes: prescriptionForm.notes || undefined,
                items: prescriptionForm.items,
            };

            const url = editingPrescription
                ? `/api/doctor/patients/${patientId}/prescriptions/${editingPrescription.id}`
                : `/api/doctor/patients/${patientId}/prescriptions`;
            const method = editingPrescription ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const body = await res.json();
            if (!res.ok) {
                setPrescriptionError(body?.error || "Failed to save prescription");
                return;
            }

            setData((prev) => {
                if (!prev) return prev;
                const updated = editingPrescription
                    ? prev.records.doctorPrescriptions.map((p) => (p.id === body.id ? body : p))
                    : [body, ...prev.records.doctorPrescriptions];
                return {
                    ...prev,
                    records: { ...prev.records, doctorPrescriptions: updated },
                };
            });

            setShowPrescriptionModal(false);
        } catch {
            setPrescriptionError("Failed to save prescription");
        } finally {
            setPrescriptionLoading(false);
        }
    }

    async function togglePrescriptionItem(
        prescriptionId: number,
        itemId: number,
        current: boolean
    ) {
        if (!patientId || !data) return;

        setData((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                records: {
                    ...prev.records,
                    doctorPrescriptions: prev.records.doctorPrescriptions.map((p) =>
                        p.id !== prescriptionId
                            ? p
                            : {
                                ...p,
                                items: p.items.map((item) =>
                                    item.id === itemId ? { ...item, isActive: !current } : item
                                ),
                            }
                    ),
                },
            };
        });

        const res = await fetch(
            `/api/doctor/patients/${patientId}/prescriptions/${prescriptionId}/items/${itemId}`,
            {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !current }),
            }
        );

        if (!res.ok) {
            setData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    records: {
                        ...prev.records,
                        doctorPrescriptions: prev.records.doctorPrescriptions.map((p) =>
                            p.id !== prescriptionId
                                ? p
                                : {
                                    ...p,
                                    items: p.items.map((item) =>
                                        item.id === itemId ? { ...item, isActive: current } : item
                                    ),
                                }
                        ),
                    },
                };
            });
            alert("Failed to update item status.");
        }
    }

    if (loading) {
        return (
            <div className="space-y-5 p-4 md:p-8">
                <div className="h-32 rounded-2xl bg-sage-100 animate-pulse" />
                <div className="h-56 rounded-2xl bg-sage-100 animate-pulse" />
                <div className="h-80 rounded-2xl bg-sage-100 animate-pulse" />
            </div>
        );
    }

    if (errorCode) {
        const title = errorCode === 403
            ? "You do not have access to this patient."
            : errorCode === 404
                ? "Patient not found."
                : "Something went wrong.";

        return (
            <div className="p-8">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 max-w-2xl">
                    <h2 className="text-xl font-display font-bold text-red-800">{title}</h2>
                    <p className="mt-2 text-red-700">{errorMessage}</p>
                    <button
                        onClick={fetchDossier}
                        className="mt-4 px-4 py-2 rounded-lg bg-red-700 text-white text-sm font-semibold"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="space-y-8 p-4 md:p-8">
            <section className="rounded-3xl border border-sage-200 bg-cream-50 p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-display font-bold text-olive-900">{data.patient.name}</h1>
                        <p className="mt-1 text-sm text-olive-600">Patient dossier</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={openAddNote} className="px-3 py-2 rounded-xl bg-olive-800 text-cream-50 text-sm font-semibold inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add Note</button>
                        <label className="px-3 py-2 rounded-xl bg-sage-700 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer">
                            <Upload className="w-4 h-4" /> Upload File
                            <input
                                type="file"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadFile(file);
                                }}
                            />
                        </label>
                        <button onClick={openNewPrescription} className="px-3 py-2 rounded-xl bg-amber-700 text-white text-sm font-semibold inline-flex items-center gap-2"><Pill className="w-4 h-4" /> New Prescription</button>
                    </div>
                </div>

                <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
                    <div className="rounded-xl bg-white border border-sage-200 p-3"><span className="text-olive-500">Age</span><div className="font-semibold">{data.patient.age ?? "-"}</div></div>
                    <div className="rounded-xl bg-white border border-sage-200 p-3"><span className="text-olive-500">Gender</span><div className="font-semibold">{data.patient.gender || "-"}</div></div>
                    <div className="rounded-xl bg-white border border-sage-200 p-3"><span className="text-olive-500">Blood Type</span><div className="font-semibold">{data.patient.bloodType || "-"}</div></div>
                    <div className="rounded-xl bg-white border border-sage-200 p-3"><span className="text-olive-500">Phone</span><div className="font-semibold">{data.patient.phone || "-"}</div></div>
                    <div className="rounded-xl bg-white border border-sage-200 p-3"><span className="text-olive-500">Scans</span><div className="font-semibold">{records.scans.length}</div></div>
                    <div className="rounded-xl bg-white border border-sage-200 p-3"><span className="text-olive-500">Reports</span><div className="font-semibold">{records.reports.length}</div></div>
                </div>

                <div className="mt-4 rounded-xl bg-white border border-sage-200 p-3 text-sm text-olive-700">
                    <span className="font-semibold">Medical history: </span>
                    {expandedMedicalHistory ? data.patient.medicalHistory || "None" : short(data.patient.medicalHistory, 140) || "None"}
                    {data.patient.medicalHistory && data.patient.medicalHistory.length > 140 && (
                        <button className="ml-2 text-olive-800 underline" onClick={() => setExpandedMedicalHistory((v) => !v)}>
                            {expandedMedicalHistory ? "Show less" : "Show more"}
                        </button>
                    )}
                </div>

                {data.alerts.length > 0 && (
                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                        {data.alerts.map((alert) => (
                            <span key={alert} className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-red-50 text-red-700 border border-red-200 px-3 py-1 text-xs font-semibold">
                                <AlertTriangle className="w-3 h-3" /> {alert}
                            </span>
                        ))}
                    </div>
                )}

                {(uploadProgressText || uploadError) && (
                    <div className="mt-3 text-sm">
                        {uploadProgressText && <p className="text-olive-700">{uploadProgressText}</p>}
                        {uploadError && <p className="text-red-700">{uploadError}</p>}
                    </div>
                )}

                <div className="mt-3 grid md:grid-cols-2 gap-3">
                    <div className="flex gap-2 items-center">
                        <label className="text-xs font-semibold text-olive-600">File Link Type</label>
                        <select
                            value={linkTypeForFile}
                            onChange={(e) => setLinkTypeForFile(e.target.value as "" | "scan" | "report" | "appointment")}
                            className="px-2 py-1 rounded border border-sage-300 bg-white text-sm"
                        >
                            <option value="">None</option>
                            <option value="scan">Scan</option>
                            <option value="report">Report</option>
                            <option value="appointment">Appointment</option>
                        </select>
                    </div>
                    {linkTypeForFile && (
                        <div className="flex gap-2 items-center">
                            <label className="text-xs font-semibold text-olive-600">Linked Record</label>
                            <select
                                value={linkIdForFile}
                                onChange={(e) => setLinkIdForFile(e.target.value)}
                                className="px-2 py-1 rounded border border-sage-300 bg-white text-sm"
                            >
                                <option value="">Select</option>
                                {(linkTypeForFile === "scan" ? records.scans : linkTypeForFile === "report" ? records.reports : records.appointments).map((item) => (
                                    <option key={item.id} value={item.id}>{item.id}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </section>

            <section className="rounded-3xl border border-sage-200 bg-white p-6">
                <details className="rounded-2xl border border-sage-200 bg-cream-50 open:bg-white transition-colors" open>
                    <summary className="list-none cursor-pointer px-4 py-3 flex items-center justify-between">
                        <span className="text-xl font-display font-bold text-olive-900">Timeline</span>
                        <span className="text-xs font-semibold text-olive-700 bg-sage-100 px-2 py-1 rounded-full">{filteredTimeline.length}</span>
                    </summary>

                    <div className="px-4 pb-4">
                        <div className="mt-1 flex flex-wrap gap-2">
                            {(Object.keys(FILTER_MAP) as TimelineFilter[]).map((chip) => (
                                <button
                                    key={chip}
                                    onClick={() => setTimelineFilter(chip)}
                                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${timelineFilter === chip ? "bg-olive-800 text-white border-olive-800" : "bg-cream-50 text-olive-700 border-sage-300"}`}
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 space-y-3">
                            {filteredTimeline.length === 0 && (
                                <div className="text-sm text-olive-500">No timeline events for this filter.</div>
                            )}
                            {filteredTimeline.map((event) => (
                                <div key={`${event.type}-${event.id}`} className="border border-sage-200 rounded-xl p-3 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <span className="text-olive-700">{eventIcon(event.type)}</span>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-olive-900 truncate">{event.summary}</p>
                                            <p className="text-xs text-olive-500">{formatDate(event.date)}</p>
                                        </div>
                                    </div>
                                    <a href={`#${event.type}-${event.record_id}`} className="text-xs font-semibold text-olive-700 hover:underline">View</a>
                                </div>
                            ))}
                        </div>
                    </div>
                </details>
            </section>

            <section className="rounded-3xl border border-sage-200 bg-white p-6">
                <h2 className="text-xl font-display font-bold text-olive-900">Records</h2>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <RecordDropdown title="Scans" count={records.scans.length}>
                        {records.scans.length === 0 ? <p className="text-sm text-olive-500 mt-2">No scans uploaded yet.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.scans.map((scan) => (
                                    <div key={scan.id} id={`scan-${scan.id}`} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="font-semibold text-olive-900">{scan.modality} <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-sage-100">{scan.status}</span></div>
                                        <div className="text-olive-600">Uploaded: {formatDate(scan.uploadedAt)}</div>
                                        <Link href={`/doctor/scan/${scan.id}`} className="text-olive-700 underline text-xs">Open scan</Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="Reports" count={records.reports.length}>
                        {records.reports.length === 0 ? <p className="text-sm text-olive-500 mt-2">No reports yet.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.reports.map((report) => (
                                    <div key={report.id} id={`report-${report.id}`} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="font-semibold text-olive-900">{short(report.diagnosis, 120)}</div>
                                        <div className="text-olive-600">{report.severity} · {formatDate(report.createdAt)}</div>
                                        <Link href={`/doctor/reports/${report.id}`} className="text-olive-700 underline text-xs">Open report</Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="Appointments" count={records.appointments.length}>
                        {records.appointments.length === 0 ? <p className="text-sm text-olive-500 mt-2">No appointments yet.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.appointments.map((appointment) => (
                                    <div key={appointment.id} id={`appointment-${appointment.id}`} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="font-semibold text-olive-900">{appointment.type} <span className="text-xs ml-2 px-2 py-0.5 rounded-full bg-sage-100">{appointment.status}</span></div>
                                        <div className="text-olive-600">{formatDateTime(appointment.scheduledAt)}</div>
                                        <div className="text-olive-700">{short(appointment.notes, 120)}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="Voice Transcripts" count={records.voiceNotes.length}>
                        {records.voiceNotes.length === 0 ? <p className="text-sm text-olive-500 mt-2">No voice notes yet.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.voiceNotes.map((voiceNote) => (
                                    <div key={voiceNote.id} id={`voice_note-${voiceNote.id}`} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="text-olive-600">{formatDate(voiceNote.createdAt)}</div>
                                        <div className="text-olive-800">{short(voiceNote.transcription, 220)}</div>
                                        {voiceNote.audioUrl && <audio controls className="mt-2 w-full"><source src={voiceNote.audioUrl} /></audio>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="Messages" count={records.messages.length}>
                        {records.messages.length === 0 ? <p className="text-sm text-olive-500 mt-2">No messages yet.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.messages.map((message) => (
                                    <div key={message.id} id={`message-${message.id}`} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="text-olive-700">{short(message.content, 180)}</div>
                                        <div className="text-olive-500 text-xs">Sender #{message.senderId} · {formatDate(message.createdAt)}</div>
                                    </div>
                                ))}
                                <Link href="/doctor/messages" className="text-olive-700 underline text-xs">Open messages</Link>
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="Notes" count={records.notes.length}>
                        {records.notes.length === 0 ? <p className="text-sm text-olive-500 mt-2">No notes yet. Click Add Note to add one.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.notes.map((note) => (
                                    <div key={note.id} id={`note-${note.id}`} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="text-olive-800">{short(note.content, 220)}</div>
                                        <div className="text-olive-500 text-xs">Doctor #{note.doctorId} · {formatDate(note.createdAt)}</div>
                                        <button onClick={() => openEditNote(note)} className="text-xs mt-1 underline text-olive-700">Edit</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="Files" count={records.files.length}>
                        {records.files.length === 0 ? <p className="text-sm text-olive-500 mt-2">No files uploaded yet.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.files.map((file) => (
                                    <div key={file.id} id={`file-${file.id}`} className="rounded-xl border border-sage-200 p-3 text-sm flex items-center justify-between gap-4">
                                        <div>
                                            <div className="font-semibold text-olive-900">{file.fileName}</div>
                                            <div className="text-olive-600">{file.fileType || "Unknown"} · {humanSize(file.fileSize)}</div>
                                        </div>
                                        <a href={file.fileUrl} target="_blank" rel="noreferrer" className="text-xs underline text-olive-700">Download</a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="OCR Prescription Documents" count={records.ocrPrescriptions.length}>
                        {records.ocrPrescriptions.length === 0 ? <p className="text-sm text-olive-500 mt-2">No uploaded prescription documents.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.ocrPrescriptions.map((ocr) => (
                                    <div key={ocr.id} id={`ocr_prescription-${ocr.id}`} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="font-semibold text-olive-900">{ocr.documentType}</div>
                                        <div className="text-olive-600">{formatDate(ocr.uploadedAt)} {ocr.ocrConfidence ? `· OCR ${(ocr.ocrConfidence * 100).toFixed(1)}%` : ""}</div>
                                        <div className="text-olive-700">{short(ocr.cleanedText, 160)}</div>
                                        <a href={ocr.imageUrl} target="_blank" rel="noreferrer" className="text-xs underline text-olive-700">View image</a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="Doctor Prescriptions" count={records.doctorPrescriptions.length}>
                        {records.doctorPrescriptions.length === 0 ? <p className="text-sm text-olive-500 mt-2">No doctor prescriptions yet.</p> : (
                            <div className="mt-2 space-y-3">
                                {records.doctorPrescriptions.map((prescription) => (
                                    <div key={prescription.id} id={`doctor_prescription-${prescription.id}`} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-semibold text-olive-900">{prescription.title}</div>
                                                <div className="text-olive-600">{formatDate(prescription.createdAt)}</div>
                                            </div>
                                            <button onClick={() => openEditPrescription(prescription)} className="text-xs underline text-olive-700">Edit</button>
                                        </div>
                                        {prescription.notes && <p className="mt-2 text-olive-700">{short(prescription.notes, 160)}</p>}
                                        <div className="mt-2 space-y-2">
                                            {prescription.items.map((item) => (
                                                <div key={item.id} className="rounded-lg border border-sage-100 p-2">
                                                    <div className="font-medium text-olive-900">{item.medicineName}</div>
                                                    <div className="text-xs text-olive-600">{[item.dosage, item.frequency, item.duration].filter(Boolean).join(" · ")}</div>
                                                    {item.directions && <div className="text-xs text-olive-700">{item.directions}</div>}
                                                    <label className="inline-flex items-center gap-2 mt-1 text-xs text-olive-700">
                                                        <input
                                                            type="checkbox"
                                                            checked={item.isActive}
                                                            onChange={() => togglePrescriptionItem(prescription.id, item.id, item.isActive)}
                                                        />
                                                        Active
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="Medications" count={records.medications.length}>
                        {records.medications.length === 0 ? <p className="text-sm text-olive-500 mt-2">No medications on record.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.medications.map((medication) => (
                                    <div key={medication.id} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="font-semibold text-olive-900">{medication.drugName}</div>
                                        <div className="text-olive-600">{[medication.dosage, medication.form, medication.frequency].filter(Boolean).join(" · ")}</div>
                                        <div className="text-xs text-olive-500">{medication.isActive ? "Active" : "Inactive"} · added by {medication.addedBy}</div>
                                    </div>
                                ))}
                                <Link href="/doctor/prescriptions" className="text-olive-700 underline text-xs">Open prescription manager</Link>
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="Allergies" count={records.allergies.length}>
                        {records.allergies.length === 0 ? <p className="text-sm text-olive-500 mt-2">No allergies on record.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.allergies.map((allergy) => (
                                    <div key={allergy.id} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="font-semibold text-olive-900">{allergy.allergen}</div>
                                        <div className="text-olive-600">{allergy.severity || "Unknown severity"}</div>
                                        {allergy.notes && <div className="text-olive-700">{short(allergy.notes, 120)}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="Conditions" count={records.conditions.length}>
                        {records.conditions.length === 0 ? <p className="text-sm text-olive-500 mt-2">No conditions on record.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.conditions.map((condition) => (
                                    <div key={condition.id} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="font-semibold text-olive-900">{condition.condition}</div>
                                        <div className="text-olive-600">{condition.status || "Unknown status"} · {condition.diagnosedAt || "Unknown date"}</div>
                                        {condition.notes && <div className="text-olive-700">{short(condition.notes, 120)}</div>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="Exercise Routines" count={records.exerciseRoutines.length}>
                        {records.exerciseRoutines.length === 0 ? <p className="text-sm text-olive-500 mt-2">No exercise routines on record.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.exerciseRoutines.map((routine) => (
                                    <div key={routine.id} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="font-semibold text-olive-900">{routine.name}</div>
                                        <div className="text-olive-600">{routine.type} · {routine.frequency || "no frequency"}</div>
                                        <div className="text-xs text-olive-500">{routine.isActive ? "Active" : "Inactive"} · added by {routine.addedBy}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </RecordDropdown>

                    <RecordDropdown title="Family Members" count={records.familyMembers.length}>
                        {records.familyMembers.length === 0 ? <p className="text-sm text-olive-500 mt-2">No family members on record.</p> : (
                            <div className="mt-2 space-y-2">
                                {records.familyMembers.map((member) => (
                                    <div key={member.id} className="rounded-xl border border-sage-200 p-3 text-sm">
                                        <div className="font-semibold text-olive-900">{member.name}</div>
                                        <div className="text-olive-600">{member.relation}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </RecordDropdown>
                </div>
            </section>

            {showNoteModal && (
                <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
                    <div className="w-full max-w-lg rounded-2xl bg-white p-5 border border-sage-200">
                        <div className="flex items-center justify-between">
                            <h3 className="font-display font-bold text-lg text-olive-900">{editingNote ? "Edit Note" : "Add Note"}</h3>
                            <button onClick={() => setShowNoteModal(false)}><X className="w-4 h-4" /></button>
                        </div>

                        <textarea
                            value={noteForm.content}
                            onChange={(e) => setNoteForm((prev) => ({ ...prev, content: e.target.value }))}
                            className="mt-3 w-full border border-sage-300 rounded-xl p-3 text-sm"
                            rows={5}
                            placeholder="Write note"
                        />

                        {!editingNote && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <select
                                    value={noteForm.linkedToType}
                                    onChange={(e) => setNoteForm((prev) => ({ ...prev, linkedToType: e.target.value as NoteForm["linkedToType"], linkedToId: "" }))}
                                    className="border border-sage-300 rounded-xl p-2 text-sm"
                                >
                                    <option value="">None</option>
                                    <option value="scan">Scan</option>
                                    <option value="report">Report</option>
                                    <option value="appointment">Appointment</option>
                                </select>

                                {noteForm.linkedToType && (
                                    <select
                                        value={noteForm.linkedToId}
                                        onChange={(e) => setNoteForm((prev) => ({ ...prev, linkedToId: e.target.value }))}
                                        className="border border-sage-300 rounded-xl p-2 text-sm"
                                    >
                                        <option value="">Select record</option>
                                        {(noteForm.linkedToType === "scan"
                                            ? records.scans
                                            : noteForm.linkedToType === "report"
                                                ? records.reports
                                                : records.appointments
                                        ).map((entry) => (
                                            <option key={entry.id} value={entry.id}>{entry.id}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {noteError && <p className="mt-2 text-sm text-red-700">{noteError}</p>}

                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => setShowNoteModal(false)} className="px-4 py-2 rounded-xl border border-sage-300 text-sm">Cancel</button>
                            <button disabled={noteLoading} onClick={submitNote} className="px-4 py-2 rounded-xl bg-olive-800 text-white text-sm inline-flex items-center gap-2">
                                <Save className="w-4 h-4" /> {noteLoading ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPrescriptionModal && (
                <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
                    <div className="w-full max-w-3xl rounded-2xl bg-white p-5 border border-sage-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="font-display font-bold text-lg text-olive-900">{editingPrescription ? "Edit Prescription" : "New Prescription"}</h3>
                            <button onClick={() => setShowPrescriptionModal(false)}><X className="w-4 h-4" /></button>
                        </div>

                        <div className="grid md:grid-cols-2 gap-3 mt-3">
                            <input
                                value={prescriptionForm.title}
                                onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, title: e.target.value }))}
                                className="border border-sage-300 rounded-xl p-2 text-sm"
                                placeholder="Title"
                            />
                            <input
                                value={prescriptionForm.notes}
                                onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, notes: e.target.value }))}
                                className="border border-sage-300 rounded-xl p-2 text-sm"
                                placeholder="Notes (optional)"
                            />
                        </div>

                        <div className="mt-4 space-y-2">
                            {prescriptionForm.items.map((item, idx) => (
                                <div key={idx} className="grid md:grid-cols-5 gap-2 border border-sage-200 rounded-xl p-3">
                                    <input value={item.medicineName} onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, items: prev.items.map((entry, i) => i === idx ? { ...entry, medicineName: e.target.value } : entry) }))} className="border border-sage-300 rounded-lg p-2 text-sm" placeholder="Medicine *" />
                                    <input value={item.dosage} onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, items: prev.items.map((entry, i) => i === idx ? { ...entry, dosage: e.target.value } : entry) }))} className="border border-sage-300 rounded-lg p-2 text-sm" placeholder="Dosage" />
                                    <input value={item.frequency} onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, items: prev.items.map((entry, i) => i === idx ? { ...entry, frequency: e.target.value } : entry) }))} className="border border-sage-300 rounded-lg p-2 text-sm" placeholder="Frequency" />
                                    <input value={item.duration} onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, items: prev.items.map((entry, i) => i === idx ? { ...entry, duration: e.target.value } : entry) }))} className="border border-sage-300 rounded-lg p-2 text-sm" placeholder="Duration" />
                                    <div className="flex gap-2">
                                        <input value={item.directions} onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, items: prev.items.map((entry, i) => i === idx ? { ...entry, directions: e.target.value } : entry) }))} className="border border-sage-300 rounded-lg p-2 text-sm flex-1" placeholder="Directions" />
                                        <button onClick={() => setPrescriptionForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))} className="px-2 rounded-lg border border-red-200 text-red-700">-</button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setPrescriptionForm((prev) => ({ ...prev, items: [...prev.items, { medicineName: "", dosage: "", frequency: "", duration: "", directions: "" }] }))} className="px-3 py-2 rounded-xl border border-sage-300 text-sm inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add medicine</button>
                        </div>

                        {prescriptionError && <p className="mt-2 text-sm text-red-700">{prescriptionError}</p>}

                        <div className="mt-4 flex justify-end gap-2">
                            <button onClick={() => setShowPrescriptionModal(false)} className="px-4 py-2 rounded-xl border border-sage-300 text-sm">Cancel</button>
                            <button disabled={prescriptionLoading} onClick={submitPrescription} className="px-4 py-2 rounded-xl bg-olive-800 text-white text-sm inline-flex items-center gap-2">
                                <Save className="w-4 h-4" /> {prescriptionLoading ? "Saving..." : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
