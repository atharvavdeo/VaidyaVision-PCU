"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Loader2, Building2, FileText, Pill,
    Image as ImageIcon, CheckCircle2, Calendar
} from "lucide-react";

interface Case_ {
    id: number;
    title?: string;
    status: string;
    presentingComplaint?: string;
    releasedAt?: string;
    createdAt: string;
    hospital?: { name: string; city: string; logoUrl?: string };
}

interface Report {
    id: number;
    status: string;
    title?: string;
    patientSummary?: string;
    releasedMedicationsJson?: string;
    releasedAt?: string;
}

interface Artifact {
    id: number;
    artifactType: string;
    fileUrl: string;
    thumbnailUrl?: string;
    originalFilename?: string;
    mimeType?: string;
    createdAt: string;
}

export default function PatientCaseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [case_, setCase_] = useState<Case_ | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

    useEffect(() => {
        Promise.all([
            fetch(`/api/cases/${id}`).then(r => r.json()),
            fetch(`/api/cases/${id}/reports`).then(r => r.json()),
            fetch(`/api/cases/${id}/artifacts`).then(r => r.json()),
        ]).then(([caseData, repData, artData]) => {
            setCase_(caseData.case || null);
            setReports(repData.reports || []);
            const arts = artData.artifacts || [];
            setArtifacts(arts);
            if (arts.length > 0) setSelectedArtifact(arts[0]);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [id]);

    const parseMedications = (json: string | undefined): string[] => {
        if (!json) return [];
        try {
            const parsed = JSON.parse(json);
            if (Array.isArray(parsed)) return parsed.map(m => typeof m === "string" ? m : JSON.stringify(m));
        } catch { }
        return json.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-cream-50">
            <Loader2 className="w-10 h-10 text-olive-900 animate-spin" />
        </div>
    );

    if (!case_) return (
        <div className="p-8 font-display text-olive-500 text-sm uppercase tracking-widest">Record not found.</div>
    );

    const latestReport = reports[reports.length - 1];
    const medications = parseMedications(latestReport?.releasedMedicationsJson);

    return (
        <div className="min-h-screen bg-cream-50 p-4 md:p-6 font-sans text-olive-900">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => router.push("/patient/cases")} className="w-8 h-8 flex items-center justify-center rounded-lg bg-cream-100 hover:bg-sage-200 transition">
                    <ArrowLeft className="w-4 h-4 text-olive-700" />
                </button>
                <div>
                    <h1 className="font-display text-xl md:text-2xl font-bold text-olive-900 leading-tight">
                        {case_.title || `Medical Record #${case_.id}`}
                    </h1>
                    {case_.hospital && (
                        <p className="font-display text-[10px] uppercase tracking-widest text-olive-400 mt-0.5">
                            {case_.hospital.name} · {case_.hospital.city}
                        </p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* ── Main Column ── */}
                <div className="lg:col-span-2 space-y-4">

                    {/* Summary Card */}
                    <div className="bento-card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="bento-title">SUMMARY</h2>
                            <div className="flex items-center gap-2 text-olive-500">
                                <Calendar className="w-4 h-4" />
                                <span className="font-display text-[10px] uppercase tracking-widest">
                                    Released {latestReport?.releasedAt ? new Date(latestReport.releasedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                </span>
                            </div>
                        </div>

                        {case_.presentingComplaint && (
                            <div className="mb-4 p-3 rounded-xl bg-cream-100 border border-sage-200 border-dashed">
                                <p className="font-display text-[10px] uppercase tracking-widest text-olive-400 mb-1">Presenting Complaint</p>
                                <p className="font-display text-sm text-olive-800">{case_.presentingComplaint}</p>
                            </div>
                        )}

                        {latestReport?.patientSummary ? (
                            <div>
                                <p className="font-display text-[10px] uppercase tracking-widest text-olive-400 mb-2">Doctor's Notes</p>
                                <div className="p-4 rounded-xl bg-sage-50 border border-sage-200 border-dashed">
                                    <p className="font-display text-sm text-olive-800 leading-relaxed whitespace-pre-wrap">
                                        {latestReport.patientSummary}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center text-olive-400">
                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="font-display text-xs uppercase tracking-wider">No summary available</p>
                            </div>
                        )}
                    </div>

                    {/* Medications */}
                    {medications.length > 0 && (
                        <div className="bento-card">
                            <h2 className="bento-title">MEDICATIONS & GUIDELINES</h2>
                            <div className="space-y-2">
                                {medications.map((med, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-cream-100 border border-sage-200 border-dashed">
                                        <Pill className="w-4 h-4 text-olive-600 mt-0.5 shrink-0" />
                                        <p className="font-display text-sm text-olive-800">{med}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Images */}
                    {artifacts.length > 0 && (
                        <div className="bento-card">
                            <h2 className="bento-title">DIAGNOSTIC IMAGES</h2>
                            <div className="grid grid-cols-3 gap-2">
                                {artifacts.map(a => (
                                    <button
                                        key={a.id}
                                        onClick={() => setSelectedArtifact(a)}
                                        className={`aspect-square rounded-xl overflow-hidden border-2 transition ${selectedArtifact?.id === a.id ? "border-olive-800" : "border-transparent hover:border-sage-400"}`}
                                    >
                                        {a.mimeType?.includes("pdf") ? (
                                            <div className="w-full h-full bg-cream-100 flex items-center justify-center">
                                                <FileText className="w-8 h-8 text-olive-400" />
                                            </div>
                                        ) : (
                                            <img src={a.thumbnailUrl || a.fileUrl} alt="Artifact" className="w-full h-full object-cover" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Full view */}
                            {selectedArtifact && (
                                <div className="mt-3 rounded-xl overflow-hidden bg-olive-900 aspect-video flex items-center justify-center">
                                    {selectedArtifact.mimeType?.includes("pdf") ? (
                                        <div className="text-cream-50 text-center">
                                            <FileText className="w-12 h-12 mx-auto mb-2 opacity-60" />
                                            <a href={selectedArtifact.fileUrl} target="_blank" rel="noopener noreferrer"
                                                className="font-display text-xs uppercase tracking-widest text-sage-400 hover:text-sage-300 underline">
                                                Open PDF →
                                            </a>
                                        </div>
                                    ) : (
                                        <img src={selectedArtifact.fileUrl} alt="Scan" className="w-full h-full object-contain" />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Side Column ── */}
                <div className="space-y-4">
                    {/* Hospital Card */}
                    <div className="bento-card bg-olive-900 text-cream-50">
                        <h2 className="font-display text-xs uppercase tracking-[0.2em] text-olive-300 border-b border-olive-700 pb-3 mb-4">HOSPITAL</h2>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-olive-700 flex items-center justify-center">
                                {case_.hospital?.logoUrl ? (
                                    <img src={case_.hospital.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded-lg" />
                                ) : (
                                    <Building2 className="w-5 h-5 text-cream-50" />
                                )}
                            </div>
                            <div>
                                <p className="font-display text-sm font-bold text-cream-50">{case_.hospital?.name || "—"}</p>
                                <p className="font-display text-[10px] uppercase tracking-widest text-olive-300">{case_.hospital?.city}</p>
                            </div>
                        </div>
                    </div>

                    {/* Status */}
                    <div className="bento-card">
                        <h2 className="bento-title">STATUS</h2>
                        <div className="flex items-center gap-3 py-2">
                            <CheckCircle2 className="w-6 h-6 text-olive-800" />
                            <div>
                                <p className="font-display text-sm font-bold text-olive-900 uppercase tracking-widest">Released</p>
                                <p className="font-display text-[10px] text-olive-400 uppercase tracking-widest">
                                    {case_.releasedAt ? new Date(case_.releasedAt).toLocaleDateString("en-IN") : latestReport?.releasedAt ? new Date(latestReport.releasedAt).toLocaleDateString("en-IN") : "—"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* What's hidden note */}
                    <div className="bento-card bg-cream-100">
                        <h2 className="font-display text-[10px] uppercase tracking-widest text-olive-400 mb-2">PRIVACY NOTE</h2>
                        <p className="font-display text-xs text-olive-500 leading-relaxed">
                            Only information approved by your doctor is shown here. Clinical notes, AI analysis details, and internal case data remain with your care team.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
