
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
    ArrowLeft,
    AlertTriangle,
    Eye,
    EyeOff,
    Pill,
    FileText,
    Activity,
    CheckCircle,
    Brain,
    Stethoscope,
    Scan,
    HeartPulse,
    Loader2,
    Mail,
    Phone,
    Send,
    RefreshCw,
    Download,
    Printer
} from "lucide-react";

export default function ScanReview() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [scan, setScan] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [treatment, setTreatment] = useState<any>(null);
    const [report, setReport] = useState<any>(null);
    const [savedReportId, setSavedReportId] = useState<number | null>(null);
    const [reportSaved, setReportSaved] = useState(false);
    const [language, setLanguage] = useState("en");
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [heatmapOpacity, setHeatmapOpacity] = useState(0.7);
    const [generatingTreatment, setGeneratingTreatment] = useState(false);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [runningML, setRunningML] = useState(false);
    const [doctorNotes, setDoctorNotes] = useState("");
    const [emailSending, setEmailSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [callSending, setCallSending] = useState(false);
    const [callSent, setCallSent] = useState(false);
    const [toast, setToast] = useState<{msg: string; type: 'success'|'error'} | null>(null);

    useEffect(() => {
        if (id) fetchScanResult();
    }, [id]);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type });

    const fetchScanResult = async () => {
        try {
            const res = await fetch(`/api/scans/${id}`);
            const data = await res.json();
            setScan(data.scan);
            if (data.scan?.doctorNotes) setDoctorNotes(data.scan.doctorNotes);
        } catch (error) {
            console.error("Failed to fetch scan:", error);
        } finally {
            setLoading(false);
        }
    };

    const runMLAnalysis = async () => {
        if (!scan) return;
        setRunningML(true);
        try {
            // Re-upload the image to the ML pipeline for real-time analysis
            // Do NOT force modality — let the ModalityRouter auto-detect the correct expert
            const imgRes = await fetch(scan.imageUrl);
            const blob = await imgRes.blob();
            const formData = new FormData();
            formData.append("file", blob, "scan.jpg");

            const mlRes = await fetch("http://localhost:8000/predict", {
                method: "POST",
                body: formData,
            });
            const mlData = await mlRes.json();

            if (mlData.status === "ACCEPTED" || mlData.status === "REJECTED") {
                // Update scan in DB via PATCH
                await fetch(`/api/scans/${scan.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        aiDiagnosis: mlData.status === "REJECTED" ? `UNCERTAIN: ${mlData.reason || 'High uncertainty'}` : mlData.diagnosis,
                        aiConfidence: mlData.confidence ?? 0,
                        aiUncertainty: mlData.uncertainty ?? 0,
                        heatmapUrl: mlData.heatmap_url,
                        expertUsed: mlData.modality,
                        triageScore: mlData.triage_score ?? 0,
                        status: mlData.status === "REJECTED" ? "rejected" : "pending",
                    }),
                });
                // Refresh scan data
                await fetchScanResult();
                if (mlData.status === "REJECTED") {
                    showToast(`Analysis uncertain (${(mlData.uncertainty * 100).toFixed(1)}% uncertainty) — flagged for manual review`, "error");
                } else {
                    showToast(`ML Analysis complete: ${mlData.diagnosis} (${(mlData.confidence * 100).toFixed(1)}% confidence)`);
                }
            } else if (mlData.status === "ERROR") {
                showToast(`ML Error: ${mlData.error || 'Unknown error'}`, "error");
            } else {
                showToast(`Unexpected ML response: ${JSON.stringify(mlData).slice(0, 100)}`, "error");
            }
        } catch (err) {
            console.error(err);
            showToast("ML server unreachable. Ensure it's running on port 8000.", "error");
        }
        setRunningML(false);
    };

    const generateTreatment = async () => {
        if (!scan) return;
        setGeneratingTreatment(true);
        try {
            const res = await fetch("/api/ai/treatment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    age: scan.patient?.age || "40",
                    sex: scan.patient?.gender || "Unknown",
                    diagnosis: scan.aiDiagnosis || "Unknown",
                    findings: scan.symptoms || "Abnormal pattern detected on imaging"
                })
            });
            const data = await res.json();
            if (data.error) {
                showToast("Treatment plan generation failed: " + data.error, "error");
            } else {
                setTreatment(data);
                showToast("Treatment plan generated via Groq AI");
            }
        } catch (err) {
            console.error(err);
            showToast("Failed to generate treatment plan", "error");
        }
        setGeneratingTreatment(false);
    };

    const generateReport = async () => {
        if (!scan) return;
        setGeneratingReport(true);
        setReportSaved(false);
        try {
            // Step 1: Generate AI report text via Groq
            const aiRes = await fetch("/api/ai/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    modality: scan.modality,
                    diagnosis: scan.aiDiagnosis,
                    findings: scan.symptoms || "Automated AI analysis findings",
                    language
                })
            });
            const aiData = await aiRes.json();

            if (aiData.error) {
                showToast("Report generation failed: " + aiData.error, "error");
                setGeneratingReport(false);
                return;
            }

            setReport(aiData);

            // Step 2: Save to database
            const saveRes = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scanId: scan.id,
                    diagnosis: scan.aiDiagnosis || "See report details",
                    findings: aiData.report || "AI-generated analysis",
                    recommendations: "Follow up as recommended in report",
                    severity: scan.priority === "critical" ? "critical"
                        : scan.priority === "high" ? "high"
                        : "moderate",
                })
            });

            if (saveRes.ok) {
                const savedData = await saveRes.json();
                setReportSaved(true);
                setSavedReportId(savedData.report?.id || null);
                showToast("Report saved to patient records");
            } else {
                showToast("Report generated but failed to save", "error");
            }
        } catch (err) {
            console.error(err);
            showToast("Report generation failed", "error");
        }
        setGeneratingReport(false);
    };

    const saveDoctorNotes = async () => {
        if (!scan || !doctorNotes.trim()) return;
        try {
            await fetch(`/api/scans/${scan.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ doctorNotes, status: "completed" }),
            });
            setScan({ ...scan, doctorNotes, status: "completed" });
            showToast("Doctor notes saved & scan marked completed");
        } catch (err) {
            console.error(err);
            showToast("Failed to save notes", "error");
        }
    };

    const sendEmailReport = async () => {
        if (!scan) return;
        setEmailSending(true);
        try {
            const res = await fetch("/api/send-report-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scanId: scan.id })
            });
            const data = await res.json();
            if (data.sent) {
                setEmailSent(true);
                showToast(`Email sent to ${scan.patient?.email || 'patient'}`);
            } else {
                showToast("Email failed: " + (data.error || "Unknown error"), "error");
            }
        } catch (err) {
            showToast("Email service error", "error");
        }
        setEmailSending(false);
    };

    const callPatient = async () => {
        if (!scan) return;
        setCallSending(true);
        try {
            const phone = scan.patient?.phone || "+917021470357";
            const res = await fetch("/api/call-reminder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    patientPhone: phone,
                    patientName: scan.patient?.name || "Patient",
                    patientId: scan.patientId || scan.patient?.id,
                    appointmentTime: "your upcoming appointment"
                })
            });
            const data = await res.json();
            if (data.called) {
                setCallSent(true);
                showToast(`Call initiated to ${phone}`);
            } else {
                showToast("Call failed: " + (data.error || "Twilio not configured"), "error");
            }
        } catch (err) {
            showToast("Call service error", "error");
        }
        setCallSending(false);
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-cream-50">
            <Loader2 className="w-10 h-10 animate-spin text-olive-800" />
        </div>
    );

    if (!scan) return <div className="p-8 text-olive-900">Scan not found</div>;

    const confidencePercent = scan.aiConfidence ? (scan.aiConfidence * 100).toFixed(1) : "0.0";
    const hasAnalysis = scan.aiDiagnosis && scan.aiDiagnosis !== "Analysis Failed";

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans text-olive-900 relative">
            {/* Toast Notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 animate-in slide-in-from-top-2 ${
                    toast.type === 'error' ? 'bg-red-700 text-white' : 'bg-olive-800 text-cream-50'
                }`}>
                    {toast.type === 'error' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-sage-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-olive-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-display font-bold text-olive-900 tracking-tight">Scan Review #{id}</h1>
                        <div className="flex items-center gap-2 text-olive-500 mt-1">
                            <span className="font-semibold text-olive-800">{scan.patient?.name || 'Patient'}</span>
                            {scan.patient?.age && <span>• {scan.patient.age}{scan.patient?.gender?.[0] || ''}</span>}
                            <span>•</span>
                            <span className="uppercase">{scan.modality}</span>
                            <span>•</span>
                            <span>{new Date(scan.uploadedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    {/* Quick Actions: Call & Email */}
                    <button
                        onClick={callPatient}
                        disabled={callSending}
                        title="Call patient"
                        className={`p-2.5 rounded-xl border transition-all ${
                            callSent ? 'bg-sage-200 border-sage-400 text-olive-800' : 'bg-cream-100 border-sage-300 text-olive-600 hover:bg-sage-100 hover:border-olive-500 hover:text-olive-800'
                        }`}
                    >
                        {callSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={sendEmailReport}
                        disabled={emailSending}
                        title="Email report to patient"
                        className={`p-2.5 rounded-xl border transition-all ${
                            emailSent ? 'bg-sage-200 border-sage-400 text-olive-800' : 'bg-cream-100 border-sage-300 text-olive-600 hover:bg-sage-100 hover:border-olive-500 hover:text-olive-800'
                        }`}
                    >
                        {emailSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                    </button>
                    <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${scan.priority === 'critical' ? 'bg-red-100 text-red-700' :
                            scan.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                'bg-sage-200 text-olive-800'
                        }`}>
                        {scan.priority || "Routine"} Priority
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Image Viewer (7 cols) */}
                <div className="lg:col-span-7 bg-olive-900 rounded-2xl overflow-hidden shadow-2xl relative group min-h-[500px] flex items-center justify-center">
                    <img
                        src={scan.imageUrl}
                        className="max-w-full max-h-[600px] object-contain"
                        alt="Medical Scan"
                    />

                    {showHeatmap && scan.heatmapUrl && (
                        <img
                            src={scan.heatmapUrl}
                            className="absolute inset-0 w-full h-full object-contain"
                            style={{ opacity: heatmapOpacity }}
                            alt="Heatmap"
                        />
                    )}

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-olive-900/90 backdrop-blur px-6 py-3 rounded-full shadow-lg border border-olive-700">
                        <button
                            onClick={() => setShowHeatmap(!showHeatmap)}
                            disabled={!scan.heatmapUrl}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                                !scan.heatmapUrl
                                    ? 'opacity-40 cursor-not-allowed text-olive-500'
                                    : showHeatmap ? 'bg-sage-400 text-olive-900' : 'hover:bg-olive-800 text-cream-100'
                                }`}
                        >
                            {showHeatmap ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            <span className="text-sm font-medium">Grad-CAM</span>
                        </button>
                        {showHeatmap && scan.heatmapUrl && (
                            <div className="flex items-center gap-2 text-cream-100 text-xs">
                                <span>Opacity</span>
                                <input
                                    type="range"
                                    min="0.1"
                                    max="1"
                                    step="0.05"
                                    value={heatmapOpacity}
                                    onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
                                    className="w-24 accent-sage-400"
                                />
                                <span>{(heatmapOpacity * 100).toFixed(0)}%</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Analysis & Actions (5 cols) */}
                <div className="lg:col-span-5 space-y-5">

                    {/* Run ML Analysis Button (if no diagnosis yet or re-run) */}
                    <button
                        onClick={runMLAnalysis}
                        disabled={runningML}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-display font-bold text-lg uppercase tracking-wider transition-all shadow-lg ${
                            hasAnalysis
                                ? 'bg-cream-100 text-olive-700 border-2 border-dashed border-sage-300 hover:bg-sage-100'
                                : 'bg-olive-800 text-cream-50 hover:bg-olive-900 shadow-olive-800/20 animate-pulse'
                        }`}
                    >
                        {runningML ? (
                            <><Loader2 className="w-6 h-6 animate-spin" /> Running ML Model...</>
                        ) : hasAnalysis ? (
                            <><RefreshCw className="w-5 h-5" /> Re-run ML Analysis</>
                        ) : (
                            <><Activity className="w-6 h-6" /> Run ML Analysis Now</>
                        )}
                    </button>

                    {/* AI Diagnosis Card */}
                    <div className="bento-card">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="p-3 bg-olive-800 text-cream-50 rounded-xl">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-lg font-display font-bold text-olive-900">AI Diagnosis</h2>
                                <p className="text-sm text-olive-500">
                                    {scan.expertUsed ? `${scan.expertUsed} Expert` : scan.modality?.toUpperCase() + " Analysis"}
                                </p>
                            </div>
                        </div>

                        {hasAnalysis ? (
                            <>
                                <div className="mb-4">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-2xl font-display font-bold text-olive-900">{scan.aiDiagnosis}</span>
                                        <span className="text-olive-800 font-bold text-lg">{confidencePercent}%</span>
                                    </div>
                                    <div className="w-full bg-sage-200 rounded-full h-3 overflow-hidden">
                                        <div
                                            className="bg-olive-800 h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${confidencePercent}%` }}
                                        />
                                    </div>
                                </div>

                                {scan.triageScore != null && (
                                    <div className="flex items-center justify-between p-3 bg-cream-200 rounded-xl text-sm mb-4">
                                        <span className="text-olive-600 font-medium">Triage Priority Score</span>
                                        <span className={`font-bold ${
                                            scan.triageScore >= 80 ? 'text-red-700' :
                                            scan.triageScore >= 60 ? 'text-orange-700' : 'text-olive-800'
                                        }`}>{scan.triageScore}/100</span>
                                    </div>
                                )}

                                {scan.aiUncertainty > 0.1 && (
                                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                        <div className="text-sm">
                                            <div className="font-bold text-yellow-800">Uncertainty: {(scan.aiUncertainty * 100).toFixed(1)}%</div>
                                            <div className="text-yellow-700 mt-1">Model uncertainty elevated. Expert review recommended.</div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-6 text-olive-400">
                                <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p className="font-display font-medium">No ML analysis yet</p>
                                <p className="text-xs mt-1">Click "Run ML Analysis" above to process this scan</p>
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="bento-card space-y-3">
                        <button
                            onClick={generateTreatment}
                            disabled={generatingTreatment || !hasAnalysis}
                            className="w-full bg-olive-800 text-cream-50 py-3.5 rounded-xl flex items-center justify-center gap-2 font-display font-bold uppercase tracking-wider hover:bg-olive-900 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-olive-800/20"
                        >
                            {generatingTreatment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Pill className="w-5 h-5" />}
                            {generatingTreatment ? "Generating via Groq..." : "Generate Treatment Plan"}
                        </button>

                        <div className="flex gap-3">
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="flex-1 px-4 py-3 border border-sage-300 rounded-xl font-medium bg-cream-50 text-olive-900 focus:ring-2 focus:ring-olive-500 outline-none"
                            >
                                <option value="en">🇬🇧 English</option>
                                <option value="hi">🇮🇳 Hindi</option>
                                <option value="es">🇪🇸 Español</option>
                            </select>
                            <button
                                onClick={generateReport}
                                disabled={generatingReport || !hasAnalysis}
                                className="flex-1 px-6 py-3 bg-olive-900 text-cream-50 rounded-xl hover:bg-olive-800 flex items-center justify-center gap-2 font-display font-bold uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generatingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                {generatingReport ? "Drafting..." : "Draft Report"}
                            </button>
                        </div>

                        {/* Quick contact row */}
                        <div className="flex gap-2 pt-1">
                            <button
                                onClick={sendEmailReport}
                                disabled={emailSending}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cream-200 text-olive-700 rounded-xl text-sm font-medium hover:bg-sage-200 transition border border-sage-300"
                            >
                                {emailSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                                {emailSent ? "Email Sent ✓" : "Email Patient"}
                            </button>
                            <button
                                onClick={callPatient}
                                disabled={callSending}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-cream-200 text-olive-700 rounded-xl text-sm font-medium hover:bg-sage-200 transition border border-sage-300"
                            >
                                {callSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
                                {callSent ? "Called ✓" : "Call Patient"}
                            </button>
                        </div>
                    </div>

                    {/* Doctor Notes */}
                    <div className="bento-card">
                        <h3 className="font-display font-bold text-olive-900 mb-3 text-sm uppercase tracking-wider">Doctor Notes</h3>
                        <textarea
                            value={doctorNotes}
                            onChange={(e) => setDoctorNotes(e.target.value)}
                            placeholder="Add clinical observations, recommendations..."
                            rows={3}
                            className="w-full px-4 py-3 border border-sage-300 rounded-xl text-sm bg-cream-50 text-olive-900 focus:ring-2 focus:ring-olive-500 outline-none resize-none"
                        />
                        <button
                            onClick={saveDoctorNotes}
                            className="mt-2 px-4 py-2 bg-olive-800 text-cream-50 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-olive-900 transition"
                        >
                            Save Notes & Mark Complete
                        </button>
                    </div>
                </div>
            </div>

            {/* Treatment Plan Section */}
            {treatment && treatment.treatment_plan && (
                <div className="mt-8">
                    <div className="bento-card !p-8">
                        <div className="flex items-center justify-between mb-6 pb-6 border-b border-sage-300 border-dashed">
                            <h2 className="text-2xl font-display font-bold flex items-center gap-3 text-olive-900">
                                <div className="p-2 bg-olive-800 text-cream-50 rounded-lg"><Pill className="w-6 h-6" /></div>
                                Personalized Treatment Plan
                            </h2>
                            {treatment.treatment_plan?.urgency_level === 'IMMEDIATE' && (
                                <span className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold border border-red-200 shadow-sm animate-pulse">
                                    ⚠️ IMMEDIATE ACTION REQUIRED
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm uppercase tracking-wider text-olive-500 font-display font-bold mb-3">Medications</h3>
                                    <div className="space-y-3">
                                        {treatment.treatment_plan?.medications?.map((med: string, i: number) => (
                                            <label key={i} className="flex items-start gap-3 p-3 bg-cream-200 rounded-xl hover:bg-sage-100 transition cursor-pointer group">
                                                <input type="checkbox" className="w-5 h-5 mt-0.5 rounded border-sage-300 text-olive-800 focus:ring-olive-500" />
                                                <span className="font-medium text-olive-700 group-hover:text-olive-900">{med}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-sm uppercase tracking-wider text-olive-500 font-display font-bold mb-3">Required Tests</h3>
                                    <ul className="space-y-2">
                                        {treatment.treatment_plan?.tests?.map((test: string, i: number) => (
                                            <li key={i} className="flex items-center gap-2 text-olive-700">
                                                <div className="w-1.5 h-1.5 rounded-full bg-olive-800" /> {test}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-sm uppercase tracking-wider text-red-600 font-display font-bold mb-3">Referrals</h3>
                                    {treatment.treatment_plan?.referrals?.map((ref: string, i: number) => (
                                        <div key={i} className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-800 font-medium mb-2 flex items-center gap-3">
                                            <AlertTriangle className="w-5 h-5 flex-shrink-0" /> {ref}
                                        </div>
                                    ))}
                                </div>
                                {treatment.treatment_plan?.lifestyle?.length > 0 && (
                                    <div>
                                        <h3 className="text-sm uppercase tracking-wider text-olive-600 font-display font-bold mb-3">Lifestyle Changes</h3>
                                        <ul className="space-y-2">
                                            {treatment.treatment_plan.lifestyle.map((item: string, i: number) => (
                                                <li key={i} className="flex items-center gap-2 text-olive-700 text-sm">
                                                    <CheckCircle className="w-4 h-4 text-olive-600 flex-shrink-0" /> {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {treatment.treatment_plan?.contraindications?.length > 0 && (
                                    <div className="bg-yellow-50 border border-yellow-200 p-5 rounded-xl">
                                        <h3 className="text-yellow-800 font-bold mb-2 flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> Contraindications
                                        </h3>
                                        <ul className="space-y-1 ml-5 list-disc text-yellow-700 text-sm">
                                            {treatment.treatment_plan.contraindications.map((item: string, i: number) => (
                                                <li key={i}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Section */}
            {report && (
                <div className="mt-8">
                    <div className="bento-card !p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-display font-bold flex items-center gap-3 text-olive-900">
                                <div className="p-2 bg-olive-800 text-cream-50 rounded-lg"><FileText className="w-6 h-6" /></div>
                                Radiology Report ({language === 'hi' ? 'Hindi' : language === 'es' ? 'Spanish' : 'English'})
                            </h2>
                            <div className="flex items-center gap-3">
                                {reportSaved && (
                                    <>
                                        <span className="flex items-center gap-1.5 text-olive-800 text-sm font-bold">
                                            <CheckCircle className="w-4 h-4" /> Saved
                                        </span>
                                        {savedReportId && (
                                            <button
                                                onClick={() => router.push(`/doctor/reports/${savedReportId}`)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-olive-800 text-cream-50 rounded-lg text-xs font-bold hover:bg-olive-900 transition"
                                            >
                                                <Printer className="w-3.5 h-3.5" /> View / Print
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="bg-cream-200 p-6 rounded-xl border border-sage-300 font-mono text-sm leading-relaxed text-olive-800 whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                            {report.report}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
