"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
    Scan,
    Clock,
    User,
    AlertTriangle,
    CheckCircle,
    ArrowRight,
    Search,
    Filter,
    Loader2,
    Mic,
    MoreHorizontal
} from "lucide-react";
import VoiceNote from "@/components/VoiceNote";

export default function DoctorQueuePage() {
    const { user } = useUser();
    const router = useRouter();
    const [scans, setScans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVoiceScan, setSelectedVoiceScan] = useState<number | null>(null);

    useEffect(() => {
        const fetchScans = async () => {
            try {
                // Fetch pending scans
                const res = await fetch("/api/scans?status=pending");
                const data = await res.json();

                // Client-side Smart Triage Sorting
                // (Server-side is better, but this demonstrates the logic)
                const sorted = data.sort((a: any, b: any) => {
                    const priorityScore: any = {
                        critical: 4,
                        high: 3,
                        medium: 2,
                        low: 1
                    };
                    return (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0);
                });

                setScans(sorted);
                setLoading(false);
            } catch (error) {
                console.error("Failed to fetch queue", error);
                setLoading(false);
            }
        };

        fetchScans();
        const interval = setInterval(fetchScans, 10000); // 10s polling
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex bg-cream-50 h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-olive-900" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream-50 p-6 md:p-8 font-sans text-olive-900">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display text-3xl font-bold text-olive-900 tracking-tight">
                        Scan Queue
                    </h1>
                    <p className="text-olive-600">
                        <span className="font-bold text-olive-800">{scans.length}</span> scans waiting for review.
                        Sorted by AI-detected urgency.
                    </p>
                </div>

                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-cream-100 border border-sage-300 rounded-lg text-olive-700 text-sm font-display font-bold hover:bg-sage-100 transition">
                        <Filter className="w-4 h-4" /> Filter
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            className="pl-9 pr-4 py-2 bg-cream-100 border border-sage-300 rounded-lg text-sm text-olive-900 focus:outline-none focus:border-olive-500 w-64"
                        />
                    </div>
                </div>
            </header>

            <div className="space-y-4">
                {scans.length === 0 ? (
                    <div className="text-center py-20 bg-cream-100 rounded-[20px] border border-sage-300 border-dashed">
                        <CheckCircle className="w-12 h-12 text-sage-400 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-olive-900">All caught up!</h3>
                        <p className="text-olive-600">No pending scans at the moment.</p>
                    </div>
                ) : (
                    scans.map((scan) => (
                        <div
                            key={scan.id}
                            className={`bg-cream-100 p-6 rounded-[20px] border border-dashed transition-all hover:shadow-md ${scan.priority === 'critical'
                                    ? 'border-red-300 bg-red-50/30'
                                    : scan.priority === 'high'
                                        ? 'border-orange-300'
                                        : 'border-sage-300'
                                }`}
                        >
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-start gap-4">
                                    {/* Thumbnail Placeholder */}
                                    <div className="w-16 h-16 bg-sage-100 rounded-lg flex-shrink-0 overflow-hidden">
                                        <img src={scan.imageUrl} alt="Scan" className="w-full h-full object-cover" />
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-display font-bold text-olive-900 text-lg">
                                                {scan.patient?.name || "Unknown Patient"}
                                            </h3>
                                            {scan.priority === 'critical' && (
                                                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Critical
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center flex-wrap gap-4 text-sm text-olive-600">
                                            <span className="flex items-center gap-1 uppercase">
                                                <Scan className="w-3 h-3" /> {scan.modality || "X-Ray"}
                                            </span>
                                            {scan.aiDiagnosis && (
                                                <span className="flex items-center gap-1 font-bold text-olive-800 capitalize bg-sage-200/50 px-2 py-0.5 rounded-md">
                                                    • {scan.aiDiagnosis.replace(/_/g, ' ')}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {new Date(scan.uploadedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    <button
                                        onClick={() => setSelectedVoiceScan(selectedVoiceScan === scan.id ? null : scan.id)}
                                        className="p-2 text-olive-500 hover:bg-sage-100 rounded-lg transition"
                                        title="Quick Voice Note"
                                    >
                                        <Mic className="w-5 h-5" />
                                    </button>

                                    <button
                                        onClick={() => router.push(`/doctor/scan/${scan.id}`)}
                                        className="flex-1 md:flex-none bg-olive-800 text-cream-50 px-6 py-2.5 rounded-lg font-display text-sm font-bold tracking-wider uppercase hover:bg-olive-900 transition flex items-center justify-center gap-2 group"
                                    >
                                        Review <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>

                            {/* Inline Voice Note Recorder */}
                            {selectedVoiceScan === scan.id && (
                                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                    <VoiceNote scanId={scan.id} onSaved={() => setSelectedVoiceScan(null)} />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
