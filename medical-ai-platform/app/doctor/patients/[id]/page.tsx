
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    User, Calendar, FileText, Activity, ArrowLeft,
    Clock, AlertTriangle, ChevronRight, Plus
} from "lucide-react";

export default function PatientHistory() {
    const params = useParams();
    const router = useRouter();
    const [patient, setPatient] = useState<any>(null);
    const [scans, setScans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) fetchPatientData();
    }, [params.id]);

    const fetchPatientData = async () => {
        try {
            // In a real app, we'd have a specific /api/patients/[id] endpoint
            // For now, we'll fetch from the doctor's patient list API and filter
            const res = await fetch(`/api/doctor/patients/${params.id}`);
            if (res.ok) {
                const data = await res.json();
                setPatient(data.patient);
                setScans(data.scans || []);
            }
        } catch (error) {
            console.error("Failed to fetch patient history:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-cream-50">
            <div className="w-10 h-10 border-4 border-olive-200 border-t-olive-800 rounded-full animate-spin" />
        </div>
    );

    if (!patient) return <div className="p-8">Patient not found</div>;

    return (
        <div className="min-h-screen bg-cream-50 p-6 font-sans text-olive-900">
            {/* Header */}
            <header className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-olive-600 hover:text-olive-900 transition-colors mb-4 font-display font-medium text-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to List
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-olive-100 rounded-2xl flex items-center justify-center text-olive-700 font-display font-bold text-3xl">
                            {patient.name?.[0]}
                        </div>
                        <div>
                            <h1 className="font-display text-4xl font-bold text-olive-900 tracking-tight">
                                {patient.name}
                            </h1>
                            <div className="flex items-center gap-4 mt-2 text-sm font-medium text-olive-600">
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-sage-200 rounded-full">
                                    <User className="w-3.5 h-3.5" /> {patient.age || "Unknown Age"} Years
                                </span>
                                <span className="flex items-center gap-1.5 px-3 py-1 bg-white border border-sage-200 rounded-full">
                                    <Activity className="w-3.5 h-3.5" /> ID: #{patient.id}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => router.push(`/doctor/scan/new?patientId=${params.id}`)}
                        className="flex items-center gap-2 px-6 py-3 bg-olive-800 text-cream-50 rounded-xl font-display text-sm font-bold tracking-wide uppercase hover:bg-olive-900 transition shadow-lg shadow-olive-800/20"
                    >
                        <Plus className="w-4 h-4" /> New Scan
                    </button>
                </div>
            </header>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Timeline (Left 2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-olive-500">
                            Medical History & Scans
                        </h2>
                        <div className="h-px flex-1 bg-sage-200 border-dashed ml-4" />
                    </div>

                    <div className="space-y-6">
                        {scans.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-sage-200 p-8 text-center text-olive-500">
                                No scan history found.
                            </div>
                        ) : (
                            scans.map((scan) => (
                                <div key={scan.id} className="bg-white rounded-2xl border border-sage-100 p-6 hover:shadow-md transition-shadow group relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-olive-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Thumbnail */}
                                        <div className="w-full md:w-48 h-32 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                                            <img
                                                src={scan.imageUrl}
                                                alt="Scan"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm uppercase">
                                                {scan.modality}
                                            </div>
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="font-display font-bold text-lg text-olive-900">
                                                        {scan.aiDiagnosis || "Processing..."}
                                                    </h3>
                                                    <p className="text-sm text-olive-500">
                                                        {new Date(scan.uploadedAt).toLocaleDateString(undefined, {
                                                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                                {scan.status === 'completed' ? (
                                                    <span className="px-3 py-1 bg-sage-200 text-olive-800 text-xs font-bold rounded-full uppercase tracking-wide">
                                                        Analyzed
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase tracking-wide animate-pulse">
                                                        {scan.status}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-olive-700 text-sm mb-4 line-clamp-2">
                                                {scan.symptoms || "No symptoms recorded."}
                                            </p>

                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => router.push(`/doctor/scan/${scan.id}`)}
                                                    className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-olive-600 hover:text-olive-900 transition-colors"
                                                >
                                                    View Analysis <ChevronRight className="w-3.5 h-3.5" />
                                                </button>
                                                {scan.aiConfidence && (
                                                    <span className="text-xs font-bold text-olive-400">
                                                        Confidence: {(scan.aiConfidence * 100).toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Sidebar (Right 1 col) */}
                <div className="space-y-6">
                    {/* Stats Card */}
                    <div className="bg-olive-900 text-cream-50 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-olive-700/30 rounded-full blur-2xl -mr-8 -mt-8" />

                        <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-olive-300 mb-6 border-b border-olive-700/50 pb-4">
                            Patient Vitals
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-olive-800/50 p-4 rounded-xl">
                                <span className="block text-xs uppercase tracking-wider text-olive-400 mb-1">Total Scans</span>
                                <span className="font-display text-2xl font-bold">{scans.length}</span>
                            </div>
                            <div className="bg-olive-800/50 p-4 rounded-xl">
                                <span className="block text-xs uppercase tracking-wider text-olive-400 mb-1">Critical</span>
                                <span className="font-display text-2xl font-bold text-red-300">
                                    {scans.filter(s => s.priority === 'critical').length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="bg-white rounded-2xl border border-sage-200 p-6">
                        <h3 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-olive-500 mb-4">
                            Recent Notes
                        </h3>
                        <div className="space-y-4">
                            <div className="p-3 bg-cream-50 rounded-lg border border-sage-100 text-sm text-olive-800 italic">
                                "Patient reported mild headaches during the last visit. Recommended follow-up MRI."
                                <div className="mt-2 text-xs font-bold text-olive-400 not-italic uppercase tracking-wide">
                                    Dr. Smith • 2 days ago
                                </div>
                            </div>
                        </div>
                        <button className="w-full mt-4 py-2 border border-dashed border-sage-300 rounded-lg text-xs font-bold uppercase tracking-wide text-olive-500 hover:bg-sage-50 transition-colors">
                            + Add Note
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
