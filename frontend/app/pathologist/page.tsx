"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
    Upload, Search, Building2, User, FlaskConical,
    CheckCircle2, Loader2, AlertCircle, FileImage,
    ChevronRight, Clock, Activity, X,
} from "lucide-react";
import { hospitalsApi } from "@/lib/api/hospitals";
import { casesApi } from "@/lib/api/cases";

interface Hospital { id: number; name: string; city: string; code: string; }
interface Patient { id: number; name: string; email: string; mrn: string; }
interface RecentCase {
    id: number; title: string; status: string; priority: string;
    createdAt: string; patientId: number;
}

type UploadStep = "hospital" | "patient" | "file" | "submitting" | "success";

const ARTIFACT_TYPES = [
    { value: "pathology_image", label: "Pathology Image" },
    { value: "scan_image", label: "Scan Image" },
    { value: "lab_pdf", label: "Lab Report PDF" },
    { value: "prescription_image", label: "Prescription" },
    { value: "other", label: "Other Document" },
];

const MODALITIES = ["brain", "lung", "skin", "ecg", "pathology", "other"];

export default function PathologistPage() {
    const { user } = useUser();
    const router = useRouter();

    // Step state
    const [step, setStep] = useState<UploadStep>("hospital");

    // Data
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [recentCases, setRecentCases] = useState<RecentCase[]>([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [patientQuery, setPatientQuery] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [artifactType, setArtifactType] = useState("pathology_image");
    const [modality, setModality] = useState("pathology");
    const [complaint, setComplaint] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState("");
    const [successInfo, setSuccessInfo] = useState<{ caseId: number; artifactId: number } | null>(null);
    const [processing, setProcessing] = useState(false);
    const [artifactStatus, setArtifactStatus] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refreshRecentCases = useCallback(async () => {
        const casesData = await casesApi.list({ sourceRole: "pathologist" });
        setRecentCases((casesData.cases || []).slice(0, 10));
    }, []);

    // Load hospitals + recent cases
    useEffect(() => {
        Promise.all([
            hospitalsApi.list(),
            casesApi.list({ sourceRole: "pathologist" }),
        ]).then(([hospData, casesData]) => {
            setHospitals(hospData.hospitals || []);
            setRecentCases((casesData.cases || []).slice(0, 10));
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    // Load patients when hospital selected
    useEffect(() => {
        if (!selectedHospital) { setPatients([]); return; }
        hospitalsApi
            .listPatients(selectedHospital.id, patientQuery)
            .then(d => setPatients(d.patients || []))
            .catch(() => { });
    }, [selectedHospital, patientQuery]);

    // Poll artifact status after submission
    const pollStatus = useCallback((caseId: number) => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
            try {
                const res = await fetch(`/api/cases/${caseId}/artifacts`);
                const data = await res.json();
                const art = data.artifacts?.[0];
                if (art) {
                    setArtifactStatus(art.status);
                    if (["processed", "failed"].includes(art.status)) {
                        clearInterval(pollRef.current!);
                        setProcessing(false);
                    }
                }
            } catch { clearInterval(pollRef.current!); }
        }, 2000);
    }, []);

    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) setFile(f);
    };

    const handleSubmit = async () => {
        if (!selectedHospital || !selectedPatient || !file) {
            setError("Hospital, patient and file are required.");
            return;
        }
        setError("");
        setStep("submitting");

        try {
            // 1. Create case
            const caseData = await casesApi.create({
                hospitalId: selectedHospital.id,
                patientId: selectedPatient.id,
                sourceRole: "pathologist",
                title: `${artifactType.replace(/_/g, " ")} — ${selectedPatient.name}`,
                presentingComplaint: complaint || null,
                priority: "medium",
            });
            const newCase = caseData?.case;
            if (!newCase) throw new Error(caseData?.error || "Failed to create case");

            // 2. Upload artifact
            const formData = new FormData();
            formData.append("file", file);
            formData.append("caseId", String(newCase.id));
            formData.append("artifactType", artifactType);
            formData.append("processingPipeline", artifactType === "pathology_image" || artifactType === "scan_image" ? "ml_scan" : "ocr_doc");
            formData.append("modalityHint", modality);

            const artRes = await fetch("/api/artifacts/upload", { method: "POST", body: formData });
            if (!artRes.ok) throw new Error(await artRes.text());
            const { artifactId } = await artRes.json();

            setSuccessInfo({ caseId: newCase.id, artifactId });
            setProcessing(true);
            setStep("success");
            pollStatus(newCase.id);

            // Refresh recent cases
            await refreshRecentCases();

        } catch (err: any) {
            setError(err.message || "Submission failed.");
            setStep("file");
        }
    };

    const reset = () => {
        setStep("hospital");
        setSelectedHospital(null);
        setSelectedPatient(null);
        setPatientQuery("");
        setFile(null);
        setComplaint("");
        setError("");
        setSuccessInfo(null);
        setProcessing(false);
        setArtifactStatus(null);
        if (pollRef.current) clearInterval(pollRef.current);
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            new: "bg-cream-200 text-olive-600",
            assigned: "bg-sage-300 text-olive-900",
            in_review: "bg-olive-200 text-olive-800",
            signed: "bg-olive-800 text-cream-50",
            released: "bg-sage-400 text-olive-900",
            closed: "bg-cream-300 text-olive-500",
        };
        return map[status] || "bg-cream-200 text-olive-600";
    };

    if (loading) return (
        <div className="min-h-screen bg-cream-50 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-olive-900 animate-spin" />
        </div>
    );

    const stepProgress = { hospital: 1, patient: 2, file: 3, submitting: 4, success: 4 }[step];

    return (
        <div className="min-h-screen bg-cream-50 p-6 md:p-8 font-sans text-olive-900">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-4xl md:text-5xl font-bold text-olive-900 tracking-tight leading-none mb-1">
                        Pathologist Portal
                    </h1>
                    <p className="text-olive-700 font-medium">
                        Hello, {user?.firstName}! Upload pathology specimens and diagnostic images.
                    </p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Left Panel: Upload Wizard ── */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Progress Bar */}
                    {step !== "success" && (
                        <div className="bento-card">
                            <div className="flex items-center gap-2 mb-4">
                                {["Hospital", "Patient", "File", "Submit"].map((label, i) => (
                                    <div key={i} className="flex items-center gap-2 flex-1">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-display font-bold shrink-0 transition-colors ${i + 1 <= stepProgress ? "bg-olive-900 text-cream-50" : "bg-cream-200 text-olive-400"}`}>
                                            {i + 1 < stepProgress ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                                        </div>
                                        <span className={`font-display text-[10px] uppercase tracking-widest hidden sm:block ${i + 1 <= stepProgress ? "text-olive-900" : "text-olive-400"}`}>{label}</span>
                                        {i < 3 && <div className={`flex-1 h-px ${i + 1 < stepProgress ? "bg-olive-800" : "bg-sage-300"}`} />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 1: Hospital */}
                    {step === "hospital" && (
                        <div className="bento-card">
                            <h2 className="bento-title">SELECT HOSPITAL</h2>
                            <div className="relative mb-4">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-400" />
                                <input
                                    type="text"
                                    placeholder="SEARCH HOSPITALS..."
                                    className="pl-9 pr-4 py-3 w-full bg-cream-100 border border-sage-300 border-dashed rounded-xl text-xs font-display tracking-widest text-olive-800 placeholder:text-olive-400 focus:outline-none focus:border-olive-800 uppercase transition-colors"
                                    onChange={(e) => {
                                        const q = e.target.value.toLowerCase();
                                        // filter in place — UI only
                                    }}
                                />
                            </div>
                            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                                {hospitals.map(h => (
                                    <button
                                        key={h.id}
                                        onClick={() => { setSelectedHospital(h); setStep("patient"); }}
                                        className="w-full flex items-center justify-between p-4 rounded-xl border border-sage-200 border-dashed hover:bg-sage-100 hover:border-olive-800 transition text-left group"
                                    >
                                        <div>
                                            <p className="font-display text-sm font-bold text-olive-900">{h.name}</p>
                                            <p className="font-display text-[10px] uppercase tracking-widest text-olive-500">{h.city} · {h.code}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-olive-400 group-hover:text-olive-900 transition" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Patient */}
                    {step === "patient" && (
                        <div className="bento-card">
                            <div className="flex items-center gap-3 mb-4">
                                <button onClick={() => setStep("hospital")} className="text-olive-400 hover:text-olive-900 font-display text-xs uppercase tracking-widest">← Back</button>
                                <span className="font-display text-[10px] text-olive-400">|</span>
                                <span className="font-display text-xs uppercase tracking-widest text-olive-700 font-bold">{selectedHospital?.name}</span>
                            </div>
                            <h2 className="bento-title">SELECT PATIENT</h2>
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-400" />
                                <input
                                    type="text"
                                    placeholder="SEARCH BY NAME, EMAIL OR MRN..."
                                    value={patientQuery}
                                    onChange={e => setPatientQuery(e.target.value)}
                                    className="pl-9 pr-4 py-3 w-full bg-cream-100 border border-sage-300 border-dashed rounded-xl text-xs font-display tracking-widest text-olive-800 placeholder:text-olive-400 focus:outline-none focus:border-olive-800 uppercase transition-colors"
                                />
                            </div>
                            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
                                {patients.length === 0 && (
                                    <div className="text-center py-8 text-olive-400">
                                        <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                        <p className="font-display text-xs uppercase tracking-wider">No patients found</p>
                                    </div>
                                )}
                                {patients.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => { setSelectedPatient(p); setStep("file"); }}
                                        className="w-full flex items-center justify-between p-4 rounded-xl border border-sage-200 border-dashed hover:bg-sage-100 hover:border-olive-800 transition text-left group"
                                    >
                                        <div>
                                            <p className="font-display text-sm font-bold text-olive-900">{p.name}</p>
                                            <p className="font-display text-[10px] uppercase tracking-widest text-olive-500">MRN: {p.mrn} · {p.email}</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-olive-400 group-hover:text-olive-900 transition" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: File Upload */}
                    {step === "file" && (
                        <div className="space-y-4">
                            <div className="bento-card">
                                <div className="flex items-center gap-3 mb-4">
                                    <button onClick={() => setStep("patient")} className="text-olive-400 hover:text-olive-900 font-display text-xs uppercase tracking-widest">← Back</button>
                                    <span className="font-display text-[10px] text-olive-400">|</span>
                                    <span className="font-display text-xs uppercase tracking-widest text-olive-700 font-bold">{selectedPatient?.name} · {selectedPatient?.mrn}</span>
                                </div>
                                <h2 className="bento-title">UPLOAD SPECIMEN</h2>

                                {/* Artifact Type */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                                    {ARTIFACT_TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            onClick={() => setArtifactType(t.value)}
                                            className={`p-3 rounded-xl border text-xs font-display uppercase tracking-widest transition ${artifactType === t.value ? "bg-olive-900 border-olive-900 text-cream-50" : "border-sage-300 border-dashed text-olive-600 hover:border-olive-800"}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Modality */}
                                <div className="flex gap-2 flex-wrap mb-4">
                                    {MODALITIES.map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setModality(m)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-display uppercase tracking-widest transition ${modality === m ? "bg-sage-400 text-olive-900 font-bold" : "bg-cream-100 text-olive-500 hover:bg-sage-200"}`}
                                        >
                                            {m}
                                        </button>
                                    ))}
                                </div>

                                {/* Drop Zone */}
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${dragOver ? "border-olive-800 bg-sage-100" : "border-sage-300 hover:border-olive-600 hover:bg-cream-100"}`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept="image/*,.pdf"
                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                    />
                                    {file ? (
                                        <div>
                                            <FileImage className="w-10 h-10 text-olive-800 mx-auto mb-3" />
                                            <p className="font-display text-sm font-bold text-olive-900">{file.name}</p>
                                            <p className="font-display text-[10px] text-olive-500 mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                                        </div>
                                    ) : (
                                        <div>
                                            <Upload className="w-10 h-10 text-olive-400 mx-auto mb-3" />
                                            <p className="font-display text-sm text-olive-600">Drop image or PDF here</p>
                                            <p className="font-display text-[10px] text-olive-400 mt-1">OR CLICK TO BROWSE</p>
                                        </div>
                                    )}
                                </div>

                                {/* Optional complaint */}
                                <textarea
                                    value={complaint}
                                    onChange={e => setComplaint(e.target.value)}
                                    placeholder="PRESENTING COMPLAINT (OPTIONAL)..."
                                    rows={2}
                                    className="w-full mt-4 px-4 py-3 bg-cream-100 border border-sage-300 border-dashed rounded-xl text-xs font-display tracking-widest text-olive-800 placeholder:text-olive-400 focus:outline-none focus:border-olive-800 resize-none uppercase"
                                />

                                {error && (
                                    <div className="mt-3 flex items-center gap-2 text-xs text-red-700 font-display">
                                        <AlertCircle className="w-4 h-4" />
                                        {error}
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={!file}
                                    className="mt-4 w-full py-4 bg-olive-900 text-cream-50 rounded-xl font-display text-sm uppercase tracking-widest font-bold hover:bg-olive-800 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Submit Case
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Submitting */}
                    {step === "submitting" && (
                        <div className="bento-card flex flex-col items-center justify-center py-16">
                            <Loader2 className="w-12 h-12 text-olive-900 animate-spin mb-4" />
                            <p className="font-display text-sm uppercase tracking-widest text-olive-600">Creating case & uploading...</p>
                        </div>
                    )}

                    {/* Success */}
                    {step === "success" && successInfo && (
                        <div className="bento-card">
                            <div className="flex items-center gap-3 mb-6">
                                <CheckCircle2 className="w-8 h-8 text-olive-800" />
                                <div>
                                    <h2 className="font-display text-xl font-bold text-olive-900">Case Created</h2>
                                    <p className="font-display text-xs uppercase tracking-widest text-olive-500">Case #{successInfo.caseId}</p>
                                </div>
                            </div>

                            {/* Processing status */}
                            <div className={`p-4 rounded-xl border mb-4 flex items-center gap-3 ${artifactStatus === "processed" ? "bg-sage-100 border-sage-400" : artifactStatus === "failed" ? "bg-red-50 border-red-300" : "bg-cream-100 border-sage-300 border-dashed"}`}>
                                {processing ? <Loader2 className="w-5 h-5 text-olive-600 animate-spin" /> :
                                    artifactStatus === "processed" ? <CheckCircle2 className="w-5 h-5 text-olive-800" /> :
                                        <AlertCircle className="w-5 h-5 text-red-500" />}
                                <div>
                                    <p className="font-display text-xs uppercase tracking-widest font-bold text-olive-900">
                                        {artifactStatus === "processed" ? "Analysis Complete" :
                                            artifactStatus === "failed" ? "Processing Failed" :
                                                "Processing Artifact..."}
                                    </p>
                                    <p className="font-display text-[10px] text-olive-500 mt-0.5">
                                        {artifactStatus === "processed" ? "Doctor will be notified" :
                                            artifactStatus === "failed" ? "Please retry or contact support" :
                                                "AI analysis in progress — you can leave this page"}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => router.push(`/doctor/cases/${successInfo.caseId}`)}
                                    className="flex-1 py-3 bg-olive-900 text-cream-50 rounded-xl font-display text-xs uppercase tracking-widest font-bold hover:bg-olive-800 transition"
                                >
                                    View Case →
                                </button>
                                <button
                                    onClick={reset}
                                    className="flex-1 py-3 bg-cream-100 text-olive-700 rounded-xl font-display text-xs uppercase tracking-widest font-bold hover:bg-sage-200 transition border border-sage-300 border-dashed"
                                >
                                    New Upload
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right Panel: Recent Uploads ── */}
                <div className="space-y-4">
                    <div className="bento-card lg:col-span-1">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="bento-title w-auto border-none m-0 p-0">RECENT CASES</h2>
                            <Activity className="w-4 h-4 text-olive-400" />
                        </div>
                        <div className="w-full border-b border-sage-300 border-dashed mb-4" />
                        <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                            {recentCases.length === 0 ? (
                                <div className="text-center py-8 text-olive-400">
                                    <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                    <p className="font-display text-xs uppercase tracking-wider">No cases yet</p>
                                </div>
                            ) : recentCases.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => router.push(`/doctor/cases/${c.id}`)}
                                    className="w-full flex items-start justify-between p-3 rounded-xl border border-sage-200 border-dashed hover:bg-cream-100 transition text-left group"
                                >
                                    <div className="min-w-0">
                                        <p className="font-display text-xs font-bold text-olive-900 truncate">{c.title || `Case #${c.id}`}</p>
                                        <p className="font-display text-[10px] uppercase tracking-widest text-olive-400 mt-0.5 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {new Date(c.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`ml-2 shrink-0 px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-widest ${statusBadge(c.status)}`}>
                                        {c.status}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tips */}
                    <div className="bento-card bg-olive-900 text-cream-50">
                        <h2 className="font-display text-xs uppercase tracking-[0.2em] text-olive-300 border-b border-olive-700 pb-3 mb-4">WORKFLOW TIPS</h2>
                        <ul className="space-y-3 font-display text-xs text-olive-200">
                            <li className="flex gap-2"><span className="text-sage-400">[1]</span> Select hospital → patient → file</li>
                            <li className="flex gap-2"><span className="text-sage-400">[2]</span> ML analysis runs automatically for scan/pathology images</li>
                            <li className="flex gap-2"><span className="text-sage-400">[3]</span> Doctor is notified and case appears in their queue</li>
                            <li className="flex gap-2"><span className="text-sage-400">[4]</span> Released reports become visible to patient</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
