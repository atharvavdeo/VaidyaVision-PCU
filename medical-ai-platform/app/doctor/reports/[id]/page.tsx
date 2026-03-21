"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer, Loader2, FileText, Send } from "lucide-react";

export default function ReportViewPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [releaseLoading, setReleaseLoading] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            fetch(`/api/reports/${id}`)
                .then((r) => r.json())
                .then((data) => {
                    setReport(data.report);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        }
    }, [id]);

    const handlePrint = () => {
        window.print();
    };

    const handleGeneratePdf = async () => {
        setPdfLoading(true);
        try {
            const refresh = report?.pdfUrl ? "" : "";
            const res = await fetch(`/api/reports/${id}/pdf${refresh}`);
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: "PDF generation failed" }));
                alert(err.error || "Failed to generate PDF");
                return;
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            window.open(url, "_blank");

            // Update local state so the button switches to "Open PDF"
            setReport((prev: any) => ({
                ...prev,
                pdfUrl: `/generated-reports/report-${id}.pdf`,
            }));
        } catch (err) {
            alert("PDF generation failed. Please try again.");
        } finally {
            setPdfLoading(false);
        }
    };

    const handleOpenPdf = () => {
        if (report?.pdfUrl) {
            window.open(report.pdfUrl, "_blank");
        }
    };

    const handleRelease = async () => {
        setReleaseLoading(true);
        try {
            const res = await fetch(`/api/reports/${id}/notify`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Release/Notify failed");
                return;
            }
            setReport((prev: any) => ({
                ...prev,
                releasedAt: data.releasedAt,
                deliveryStatus: data.deliveryStatus,
                pdfUrl: data.pdfUrl || prev.pdfUrl,
            }));
            alert(data.deliveryStatus === "sent" 
                ? "Report released and n8n webhook triggered successfully!"
                : `Report released, but webhook failed: ${data.deliveryDetail}`);
        } catch {
            alert("Release failed. Please try again.");
        } finally {
            setReleaseLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-olive-800" />
            </div>
        );
    }

    if (!report) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-olive-400">
                <p className="text-lg font-display font-bold">Report not found</p>
                <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-cream-100 rounded-xl text-sm border border-sage-300">
                    Go Back
                </button>
            </div>
        );
    }

    const reportDate = new Date(report.createdAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric"
    });

    return (
        <div className="max-w-4xl mx-auto py-8">
            {/* Action Bar (hidden on print) */}
            <div className="print:hidden flex items-center justify-between mb-6">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-olive-600 hover:text-olive-900 transition">
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <div className="flex gap-3">
                    {/* PDF Action */}
                    {report.pdfUrl ? (
                        <button
                            onClick={handleOpenPdf}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-cream-50 rounded-xl font-display font-bold text-sm hover:bg-emerald-800 transition shadow-lg shadow-emerald-700/20"
                        >
                            <FileText className="w-4 h-4" /> Open PDF
                        </button>
                    ) : (
                        <button
                            onClick={handleGeneratePdf}
                            disabled={pdfLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 text-cream-50 rounded-xl font-display font-bold text-sm hover:bg-blue-800 transition shadow-lg shadow-blue-700/20 disabled:opacity-50"
                        >
                            {pdfLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileText className="w-4 h-4" />
                            )}
                            {pdfLoading ? "Generating..." : "Generate PDF"}
                        </button>
                    )}
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-5 py-2.5 bg-olive-800 text-cream-50 rounded-xl font-display font-bold text-sm hover:bg-olive-900 transition shadow-lg shadow-olive-800/20"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    {/* Release Button */}
                    {!report.releasedAt && (
                        <button
                            onClick={handleRelease}
                            disabled={releaseLoading}
                            className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-display font-bold text-sm hover:bg-amber-700 transition shadow-lg shadow-amber-600/20 disabled:opacity-50"
                        >
                            {releaseLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            {releaseLoading ? "Releasing..." : "Release Report"}
                        </button>
                    )}
                    {report.releasedAt && (
                        <span className="flex items-center gap-2 px-5 py-2.5 bg-emerald-100 text-emerald-800 rounded-xl font-display font-bold text-sm">
                            <Send className="w-4 h-4" /> Released ✓
                        </span>
                    )}
                </div>
            </div>

            {/* Status Badges (hidden on print) */}
            {(report.deliveryStatus || report.releasedAt) && (
                <div className="print:hidden flex gap-3 mb-4">
                    {report.releasedAt && (
                        <span className="text-xs px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-medium">
                            Released {new Date(report.releasedAt).toLocaleDateString("en-IN")}
                        </span>
                    )}
                    {report.deliveryStatus && report.deliveryStatus !== "pending" && (
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                            report.deliveryStatus === "sent"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                        }`}>
                            Email: {report.deliveryStatus}
                        </span>
                    )}
                </div>
            )}

            {/* Printable Report */}
            <div ref={printRef} className="bg-cream-50 rounded-[20px] shadow-lg border border-sage-300 overflow-hidden print:shadow-none print:border-none print:rounded-none">
                {/* Header */}
                <div className="text-white px-10 py-8" style={{ backgroundColor: '#2D3A1E', color: 'white' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-display font-bold tracking-tight">VaidyaVision</h1>
                            <p className="text-sage-300 text-sm mt-1">AI-Powered Medical Intelligence Platform</p>
                        </div>
                        <div className="text-right text-sm">
                            <p className="font-bold">Medical Report</p>
                            <p className="text-sage-400">Report #{report.id}</p>
                            <p className="text-sage-400">{reportDate}</p>
                        </div>
                    </div>
                </div>

                {/* Patient & Doctor Info */}
                <div className="px-10 py-6 grid grid-cols-2 gap-8 border-b border-sage-200 text-sm">
                    <div>
                        <h3 className="text-xs uppercase tracking-wider text-olive-500 font-bold mb-2">Patient Information</h3>
                        <p className="font-display font-bold text-olive-900 text-lg">{report.patient?.name || "Patient"}</p>
                        <p className="text-olive-600">{report.patient?.email}</p>
                        {report.patient?.age && <p className="text-olive-600">Age: {report.patient.age} | Gender: {report.patient.gender || 'N/A'}</p>}
                        {report.patient?.bloodType && <p className="text-olive-600">Blood Type: {report.patient.bloodType}</p>}
                    </div>
                    <div className="text-right">
                        <h3 className="text-xs uppercase tracking-wider text-olive-500 font-bold mb-2">Reporting Physician</h3>
                        <p className="font-display font-bold text-olive-900 text-lg">{report.doctor?.name || "Doctor"}</p>
                        <p className="text-olive-600">{report.doctor?.specialty || 'General Medicine'}</p>
                        <p className="text-olive-600">{report.doctor?.email}</p>
                    </div>
                </div>

                {/* Scan Info */}
                {report.scan && (
                    <div className="px-10 py-4 bg-cream-100 border-b border-sage-200 text-sm flex items-center gap-6">
                        <div>
                            <span className="text-olive-500 font-medium">Modality:</span>{" "}
                            <span className="font-bold uppercase">{report.scan.modality}</span>
                        </div>
                        <div>
                            <span className="text-olive-500 font-medium">AI Diagnosis:</span>{" "}
                            <span className="font-bold">{report.scan.aiDiagnosis || 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-olive-500 font-medium">Confidence:</span>{" "}
                            <span className="font-bold">{report.scan.aiConfidence ? `${(report.scan.aiConfidence * 100).toFixed(1)}%` : 'N/A'}</span>
                        </div>
                        <div>
                            <span className="text-olive-500 font-medium">Severity:</span>{" "}
                            <span className={`font-bold uppercase ${report.severity === 'critical' ? 'text-red-600' : report.severity === 'high' ? 'text-orange-600' : 'text-olive-800'}`}>
                                {report.severity}
                            </span>
                        </div>
                    </div>
                )}

                {/* Scan Image + Heatmap */}
                {report.scan?.imageUrl && (
                    <div className="px-10 py-6 border-b border-sage-200">
                        <h3 className="text-xs uppercase tracking-wider text-olive-500 font-bold mb-4">Scan Images</h3>
                        <div className="flex gap-4 items-start">
                            <div className="flex-1">
                                <p className="text-xs text-olive-500 mb-2 font-medium">Original Scan</p>
                                <div className="bg-olive-900 rounded-xl overflow-hidden">
                                    <img src={report.scan.imageUrl} alt="Scan" className="w-full max-h-[300px] object-contain" />
                                </div>
                            </div>
                            {report.scan.heatmapUrl && (
                                <div className="flex-1">
                                    <p className="text-xs text-olive-500 mb-2 font-medium">GradCAM Heatmap (AI Focus Areas)</p>
                                    <div className="bg-olive-900 rounded-xl overflow-hidden">
                                        <img src={report.scan.heatmapUrl} alt="Heatmap" className="w-full max-h-[300px] object-contain" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Diagnosis */}
                <div className="px-10 py-6 border-b border-sage-200">
                    <h3 className="text-xs uppercase tracking-wider text-olive-500 font-bold mb-3">Diagnosis</h3>
                    <p className="text-xl font-display font-bold text-olive-900">{report.diagnosis}</p>
                </div>

                {/* Findings */}
                <div className="px-10 py-6 border-b border-sage-200">
                    <h3 className="text-xs uppercase tracking-wider text-olive-500 font-bold mb-3">Findings</h3>
                    <div className="text-olive-800 leading-relaxed whitespace-pre-wrap text-sm">
                        {report.findings}
                    </div>
                </div>

                {/* Recommendations */}
                {report.recommendations && (
                    <div className="px-10 py-6 border-b border-sage-200">
                        <h3 className="text-xs uppercase tracking-wider text-olive-500 font-bold mb-3">Recommendations</h3>
                        <div className="text-olive-800 leading-relaxed whitespace-pre-wrap text-sm">
                            {report.recommendations}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="px-10 py-6 bg-cream-100 text-xs text-olive-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-olive-700">VaidyaVision Medical Intelligence</p>
                            <p>This report was generated using AI-assisted analysis. Clinical correlation is advised.</p>
                        </div>
                        <div className="text-right">
                            <p>Status: <span className="font-bold uppercase text-olive-800">{report.status}</span></p>
                            <p>Generated: {reportDate}</p>
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-sage-300 text-center text-[10px] uppercase tracking-widest text-olive-400">
                        Confidential Medical Document — For authorized use only
                    </div>
                </div>
            </div>
        </div>
    );
}
