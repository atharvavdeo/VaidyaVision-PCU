"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeft, Loader2, FileImage, AlertCircle, CheckCircle2,
    ChevronDown, Send, Activity, Eye, EyeOff, Unlock, FileText,
    Stethoscope, ClipboardList, Save
} from "lucide-react";

interface Case_ {
    id: number; title?: string; status: string; priority: string;
    presentingComplaint?: string; internalSummary?: string;
    sourceRole: string; createdAt: string; patientId: number; hospitalId: number;
}
interface Artifact {
    id: number; artifactType: string; processingPipeline: string;
    fileUrl: string; status: string; processingResultJson?: string;
    modalityHint?: string; originalFilename?: string; mimeType?: string;
    createdAt: string; patientVisible: boolean;
}
interface Report {
    id: number; status: string; title?: string; contentJson?: string;
    patientSummary?: string; releasedMedicationsJson?: string;
    signedAt?: string; releasedAt?: string; createdAt: string;
}
interface Assignment {
    id: number; status: string; assignmentType: string;
    assignedToMembership?: { user?: { name: string }; specialty?: { name: string } };
}

export default function CaseDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [case_, setCase_] = useState<Case_ | null>(null);
    const [artifacts, setArtifacts] = useState<Artifact[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
    const [mlResult, setMlResult] = useState<any>(null);

    // Report form state
    const [editingReport, setEditingReport] = useState<Report | null>(null);
    const [reportTitle, setReportTitle] = useState("");
    const [findings, setFindings] = useState("");
    const [patientSummary, setPatientSummary] = useState("");
    const [medications, setMedications] = useState("");
    const [saving, setSaving] = useState(false);
    const [actionMsg, setActionMsg] = useState("");

    const loadAll = async () => {
        try {
            const [caseRes, artRes, repRes, asnRes] = await Promise.all([
                fetch(`/api/cases/${id}`),
                fetch(`/api/cases/${id}/artifacts`),
                fetch(`/api/cases/${id}/reports`),
                fetch(`/api/cases/${id}/assignments`),
            ]);
            const [caseData, artData, repData, asnData] = await Promise.all([
                caseRes.json(), artRes.json(), repRes.json(), asnRes.json()
            ]);
            setCase_(caseData.case || null);
            setArtifacts(artData.artifacts || []);
            setReports(repData.reports || []);
            setAssignments(asnData.assignments || []);

            // Select first artifact
            if (artData.artifacts?.length > 0) {
                const art = artData.artifacts[0];
                setSelectedArtifact(art);
                if (art.processingResultJson) setMlResult(JSON.parse(art.processingResultJson));
            }
        } catch { }
        setLoading(false);
    };

    useEffect(() => { loadAll(); }, [id]);

    const selectArtifact = (art: Artifact) => {
        setSelectedArtifact(art);
        setMlResult(art.processingResultJson ? JSON.parse(art.processingResultJson) : null);
    };

    const startNewReport = () => {
        setEditingReport(null);
        setReportTitle(`Report — Case #${id}`);
        setFindings("");
        setPatientSummary("");
        setMedications("");
    };

    const editReport = (r: Report) => {
        setEditingReport(r);
        setReportTitle(r.title || "");
        try { const c = JSON.parse(r.contentJson || "{}"); setFindings(c.findings || ""); } catch { setFindings(""); }
        setPatientSummary(r.patientSummary || "");
        setMedications(r.releasedMedicationsJson || "");
    };

    const saveDraft = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/cases/${id}/reports`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: reportTitle,
                    contentJson: { findings },
                    patientSummary,
                    releasedMedicationsJson: medications || null,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setActionMsg("Draft saved.");
                await loadAll();
                editReport(data.report);
            } else { setActionMsg(data.error || "Error"); }
        } catch { setActionMsg("Error saving draft"); }
        setSaving(false);
        setTimeout(() => setActionMsg(""), 3000);
    };

    const signReport = async () => {
        if (!editingReport) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/cases/${id}/reports`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reportId: editingReport.id,
                    action: "sign",
                    contentJson: { findings },
                    patientSummary,
                    releasedMedicationsJson: medications || null,
                }),
            });
            const data = await res.json();
            if (res.ok) { setActionMsg("Report signed."); await loadAll(); }
            else setActionMsg(data.error || "Error");
        } catch { setActionMsg("Error"); }
        setSaving(false);
        setTimeout(() => setActionMsg(""), 3000);
    };

    const releaseReport = async (releaseArtifacts = false) => {
        if (!editingReport) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/cases/${id}/reports`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reportId: editingReport.id,
                    action: "release",
                    releaseArtifacts,
                }),
            });
            const data = await res.json();
            if (res.ok) { setActionMsg("Released to patient ✓"); await loadAll(); }
            else setActionMsg(data.error || "Error");
        } catch { setActionMsg("Error"); }
        setSaving(false);
        setTimeout(() => setActionMsg(""), 4000);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-cream-50">
            <Loader2 className="w-10 h-10 text-olive-900 animate-spin" />
        </div>
    );

    if (!case_) return (
        <div className="p-8 text-olive-500 font-display text-sm uppercase tracking-widest">Case not found.</div>
    );

    const latestReport = reports[reports.length - 1];
    const isReporting = !!reportTitle || !!editingReport;

    return (
        <div className="min-h-screen bg-cream-50 p-4 md:p-6 font-sans text-olive-900">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => router.push("/doctor/cases")} className="w-8 h-8 flex items-center justify-center rounded-lg bg-cream-100 hover:bg-sage-200 transition">
                    <ArrowLeft className="w-4 h-4 text-olive-700" />
                </button>
                <div className="flex-1">
                    <h1 className="font-display text-xl md:text-2xl font-bold text-olive-900 leading-tight">
                        {case_.title || `Case #${case_.id}`}
                    </h1>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-widest ${case_.priority === "critical" ? "bg-red-100 text-red-700" : case_.priority === "high" ? "bg-olive-200 text-olive-800" : "bg-sage-200 text-olive-700"}`}>
                            {case_.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-widest bg-sage-300 text-olive-900">
                            {case_.status.replace("_", " ")}
                        </span>
                        <span className="font-display text-[10px] text-olive-400 uppercase tracking-widest">via {case_.sourceRole}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

                {/* ── Left: Artifacts ── */}
                <div className="xl:col-span-1 space-y-3">
                    <div className="bento-card">
                        <h2 className="bento-title">ARTIFACTS ({artifacts.length})</h2>
                        {artifacts.length === 0 ? (
                            <div className="py-8 text-center text-olive-400">
                                <FileImage className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="font-display text-xs uppercase tracking-wider">No artifacts</p>
                            </div>
                        ) : artifacts.map(a => (
                            <button
                                key={a.id}
                                onClick={() => selectArtifact(a)}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition mb-2 text-left ${selectedArtifact?.id === a.id ? "border-olive-800 bg-sage-100" : "border-sage-200 border-dashed hover:bg-cream-100"}`}
                            >
                                <div className={`w-2 h-2 rounded-full ${a.status === "processed" ? "bg-olive-600" : a.status === "processing" ? "bg-sage-500 animate-pulse" : a.status === "failed" ? "bg-red-500" : "bg-cream-300"}`} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-display text-xs font-bold text-olive-900 truncate">
                                        {a.originalFilename || a.artifactType.replace(/_/g, " ")}
                                    </p>
                                    <p className="font-display text-[9px] uppercase tracking-widest text-olive-400">
                                        {a.status} · {a.modalityHint || a.artifactType}
                                    </p>
                                </div>
                                {!a.patientVisible && <EyeOff className="w-3 h-3 text-olive-300 shrink-0" />}
                            </button>
                        ))}
                    </div>

                    {/* Assignments */}
                    <div className="bento-card">
                        <h2 className="bento-title">ASSIGNMENTS</h2>
                        {assignments.length === 0 ? (
                            <p className="font-display text-xs text-olive-400 uppercase tracking-wider">No assignments</p>
                        ) : assignments.map(a => (
                            <div key={a.id} className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-cream-100">
                                <Stethoscope className="w-3 h-3 text-olive-500 shrink-0" />
                                <div>
                                    <p className="font-display text-xs font-bold text-olive-900">
                                        {a.assignedToMembership?.user?.name || "Doctor"}
                                    </p>
                                    <p className="font-display text-[9px] uppercase tracking-widest text-olive-400">
                                        {a.assignmentType} · {a.status}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Center: Image + ML Results ── */}
                <div className="xl:col-span-1 space-y-3">
                    {/* Image viewer */}
                    <div className="bento-card">
                        <h2 className="bento-title">VIEWER</h2>
                        {selectedArtifact ? (
                            <div className="rounded-xl overflow-hidden bg-olive-900 aspect-square flex items-center justify-center">
                                {selectedArtifact.mimeType?.includes("pdf") ? (
                                    <div className="text-cream-50 text-center p-8">
                                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-60" />
                                        <a href={selectedArtifact.fileUrl} target="_blank" rel="noopener noreferrer"
                                            className="font-display text-xs uppercase tracking-widest text-sage-400 hover:text-sage-300 underline">
                                            Open PDF →
                                        </a>
                                    </div>
                                ) : (
                                    <img
                                        src={selectedArtifact.fileUrl}
                                        alt="Artifact"
                                        className="w-full h-full object-contain"
                                    />
                                )}
                            </div>
                        ) : (
                            <div className="aspect-square rounded-xl bg-cream-100 flex items-center justify-center">
                                <FileImage className="w-12 h-12 text-olive-300" />
                            </div>
                        )}
                    </div>

                    {/* ML Results */}
                    {mlResult && (
                        <div className="bento-card bg-olive-900 text-cream-50">
                            <h2 className="font-display text-xs uppercase tracking-[0.2em] text-olive-300 border-b border-olive-700 pb-3 mb-4">
                                AI ANALYSIS
                            </h2>
                            <div className="space-y-3">
                                {mlResult.diagnosis && (
                                    <div>
                                        <p className="font-display text-[10px] uppercase tracking-widest text-olive-400">Diagnosis</p>
                                        <p className="font-display text-base font-bold text-cream-50 mt-0.5">{mlResult.diagnosis}</p>
                                    </div>
                                )}
                                {mlResult.confidence != null && (
                                    <div>
                                        <div className="flex justify-between items-center mb-1">
                                            <p className="font-display text-[10px] uppercase tracking-widest text-olive-400">Confidence</p>
                                            <span className="font-display text-xs text-olive-300">{(mlResult.confidence * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-olive-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-sage-400 rounded-full" style={{ width: `${(mlResult.confidence || 0) * 100}%` }} />
                                        </div>
                                    </div>
                                )}
                                {mlResult.triage_score && (
                                    <div className="flex justify-between">
                                        <p className="font-display text-[10px] uppercase tracking-widest text-olive-400">Triage Score</p>
                                        <span className={`font-display text-xs font-bold ${mlResult.triage_score >= 80 ? "text-red-400" : mlResult.triage_score >= 60 ? "text-orange-400" : "text-sage-400"}`}>
                                            {mlResult.triage_score}/100
                                        </span>
                                    </div>
                                )}
                                {mlResult.heatmap_url && (
                                    <div>
                                        <p className="font-display text-[10px] uppercase tracking-widest text-olive-400 mb-2">GradCAM Heatmap</p>
                                        <img src={mlResult.heatmap_url} alt="Heatmap" className="w-full rounded-lg opacity-90" />
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right: Report Builder ── */}
                <div className="xl:col-span-1 space-y-3">
                    {/* Existing reports */}
                    {reports.length > 0 && (
                        <div className="bento-card">
                            <h2 className="bento-title">REPORTS</h2>
                            {reports.map(r => (
                                <button
                                    key={r.id}
                                    onClick={() => editReport(r)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border mb-2 text-left transition ${editingReport?.id === r.id ? "border-olive-800 bg-sage-100" : "border-sage-200 border-dashed hover:bg-cream-100"}`}
                                >
                                    <div>
                                        <p className="font-display text-xs font-bold text-olive-900">{r.title || `Report #${r.id}`}</p>
                                        <p className="font-display text-[9px] uppercase tracking-widest text-olive-400">{r.status}</p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-widest ${r.status === "released" ? "bg-sage-400 text-olive-900" : r.status === "signed" ? "bg-olive-800 text-cream-50" : "bg-cream-200 text-olive-500"}`}>
                                        {r.status}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Report form */}
                    <div className="bento-card">
                        <div className="flex justify-between items-center mb-0">
                            <h2 className="bento-title">{editingReport ? "EDIT REPORT" : "NEW REPORT"}</h2>
                            {!isReporting && (
                                <button onClick={startNewReport} className="font-display text-[10px] uppercase tracking-widest text-olive-600 hover:text-olive-900">
                                    + Create
                                </button>
                            )}
                        </div>

                        {(isReporting || editingReport) && (
                            <div className="space-y-3 mt-4">
                                <input
                                    value={reportTitle}
                                    onChange={e => setReportTitle(e.target.value)}
                                    placeholder="REPORT TITLE..."
                                    className="w-full px-4 py-2.5 bg-cream-100 border border-sage-300 border-dashed rounded-xl text-xs font-display tracking-widest text-olive-800 placeholder:text-olive-400 focus:outline-none focus:border-olive-800 uppercase"
                                />
                                <textarea
                                    value={findings}
                                    onChange={e => setFindings(e.target.value)}
                                    placeholder="CLINICAL FINDINGS (CLINICIAN ONLY)..."
                                    rows={4}
                                    className="w-full px-4 py-2.5 bg-cream-100 border border-sage-300 border-dashed rounded-xl text-xs font-display tracking-widest text-olive-800 placeholder:text-olive-400 focus:outline-none focus:border-olive-800 resize-none uppercase"
                                />
                                <textarea
                                    value={patientSummary}
                                    onChange={e => setPatientSummary(e.target.value)}
                                    placeholder="PATIENT SUMMARY (VISIBLE AFTER RELEASE)..."
                                    rows={3}
                                    className="w-full px-4 py-2.5 bg-sage-100 border border-sage-400 border-dashed rounded-xl text-xs font-display tracking-widest text-olive-800 placeholder:text-olive-400 focus:outline-none focus:border-olive-800 resize-none uppercase"
                                />
                                <textarea
                                    value={medications}
                                    onChange={e => setMedications(e.target.value)}
                                    placeholder="MEDICATIONS / GUIDELINES (JSON OR PLAIN TEXT)..."
                                    rows={2}
                                    className="w-full px-4 py-2.5 bg-cream-100 border border-sage-300 border-dashed rounded-xl text-xs font-display tracking-widest text-olive-800 placeholder:text-olive-400 focus:outline-none focus:border-olive-800 resize-none uppercase"
                                />

                                {actionMsg && (
                                    <p className="font-display text-xs text-olive-700 bg-sage-100 px-3 py-2 rounded-lg">{actionMsg}</p>
                                )}

                                {/* Action buttons */}
                                <div className="flex gap-2 flex-wrap">
                                    {!editingReport && (
                                        <button onClick={saveDraft} disabled={saving} className="flex-1 py-2.5 bg-cream-200 text-olive-800 rounded-xl font-display text-[10px] uppercase tracking-widest hover:bg-sage-200 transition disabled:opacity-50 flex items-center justify-center gap-1">
                                            <Save className="w-3 h-3" /> Save Draft
                                        </button>
                                    )}
                                    {editingReport?.status === "draft" && (
                                        <>
                                            <button onClick={saveDraft} disabled={saving} className="flex-1 py-2.5 bg-cream-200 text-olive-800 rounded-xl font-display text-[10px] uppercase tracking-widest hover:bg-sage-200 transition disabled:opacity-50 flex items-center justify-center gap-1">
                                                <Save className="w-3 h-3" /> Save
                                            </button>
                                            <button onClick={signReport} disabled={saving} className="flex-1 py-2.5 bg-olive-900 text-cream-50 rounded-xl font-display text-[10px] uppercase tracking-widest hover:bg-olive-700 transition disabled:opacity-50 flex items-center justify-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> Sign
                                            </button>
                                        </>
                                    )}
                                    {editingReport?.status === "signed" && (
                                        <>
                                            <button onClick={() => releaseReport(false)} disabled={saving} className="flex-1 py-2.5 bg-sage-400 text-olive-900 rounded-xl font-display text-[10px] uppercase tracking-widest hover:bg-sage-500 transition disabled:opacity-50 flex items-center justify-center gap-1">
                                                <Unlock className="w-3 h-3" /> Release
                                            </button>
                                            <button onClick={() => releaseReport(true)} disabled={saving} className="flex-1 py-2.5 bg-olive-900 text-cream-50 rounded-xl font-display text-[10px] uppercase tracking-widest hover:bg-olive-700 transition disabled:opacity-50 flex items-center justify-center gap-1">
                                                <Eye className="w-3 h-3" /> Release + Show Images
                                            </button>
                                        </>
                                    )}
                                    {editingReport?.status === "released" && (
                                        <div className="w-full flex items-center gap-2 py-2 px-3 bg-sage-100 rounded-xl">
                                            <CheckCircle2 className="w-4 h-4 text-olive-800" />
                                            <p className="font-display text-xs text-olive-700 uppercase tracking-widest">Report released to patient</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {!isReporting && !editingReport && reports.length === 0 && (
                            <div className="text-center py-8 text-olive-400">
                                <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                <p className="font-display text-xs uppercase tracking-wider">No reports yet</p>
                                <button onClick={startNewReport} className="mt-3 font-display text-xs uppercase tracking-widest text-olive-600 hover:text-olive-900 underline underline-offset-4">
                                    Create Report
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
