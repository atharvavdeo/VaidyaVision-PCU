"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    Upload, Scan, Calendar, MessageSquare, FileText,
    Activity, TrendingUp, Brain, HeartPulse, Stethoscope,
    CheckCircle, Clock,
} from "lucide-react";

interface PatientStats {
    totalScans: number;
    completedScans: number;
    pendingScans: number;
    appointments: number;
}

interface RecentScan {
    id: number;
    modality: string;
    status: string;
    aiDiagnosis: string | null;
    aiConfidence: number | null;
    uploadedAt: string;
}

const MODALITY_ICONS: Record<string, React.ElementType> = {
    brain: Brain, lung: Stethoscope, skin: Scan, ecg: HeartPulse,
};
const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
    pending: { color: "text-yellow-600", icon: Clock },
    processing: { color: "text-blue-600", icon: Activity },
    completed: { color: "text-green-600", icon: CheckCircle },
};

export default function PatientDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<PatientStats | null>(null);
    const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/analytics")
            .then((r) => {
                if (!r.ok) {
                    throw new Error("Failed to load analytics");
                }
                return r.json();
            })
            .then((data) => {
                setStats(data.stats);
                setRecentScans(data.recentScans || []);
                setError(null);
                setLoading(false);
            })
            .catch(() => {
                setError("Unable to load dashboard data. Please refresh and try again.");
                setLoading(false);
            });
    }, []);

    const s = stats || { totalScans: 0, completedScans: 0, pendingScans: 0, appointments: 0 };

    return (
        <div className="space-y-6">
            {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Welcome Banner */}
            <div className="bg-olive-900 rounded-2xl p-8 text-cream-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
                <div className="relative z-10">
                    <h2 className="text-2xl font-display font-bold mb-2">Welcome back 👋</h2>
                    <p className="text-sage-300 text-sm max-w-lg">
                        Upload your medical scans for AI-powered analysis. Our system provides instant preliminary results with GradCAM heatmap visualization.
                    </p>
                    <Link
                        href="/patient/upload"
                        className="inline-flex items-center gap-2 mt-4 px-6 py-2.5 bg-cream-50 text-olive-900 rounded-lg font-display font-bold text-sm hover:bg-cream-100 transition-colors uppercase tracking-wider"
                    >
                        <Upload className="w-4 h-4" />
                        Upload New Scan
                    </Link>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MiniStat label="Total Scans" value={s.totalScans} icon={Scan} />
                <MiniStat label="Completed" value={s.completedScans} icon={CheckCircle} />
                <MiniStat label="Pending" value={s.pendingScans} icon={Clock} />
                <MiniStat label="Appointments" value={s.appointments} icon={Calendar} />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuickAction
                    title="My Scans"
                    description="View scan history and results"
                    icon={Scan}
                    href="/patient/scans"
                    color="bg-cream-100 border-sage-300 text-olive-900 border-dashed hover:bg-sage-200"
                />
                <QuickAction
                    title="Messages"
                    description="Chat with your doctor"
                    icon={MessageSquare}
                    href="/patient/messages"
                    color="bg-cream-100 border-sage-300 text-olive-900 border-dashed hover:bg-sage-200"
                />
                <QuickAction
                    title="Appointments"
                    description="Schedule or view appointments"
                    icon={Calendar}
                    href="/patient/appointments"
                    color="bg-cream-100 border-sage-300 text-olive-900 border-dashed hover:bg-sage-200"
                />
            </div>

            {/* Recent Scans */}
            <div className="bento-card">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-sage-300 border-dashed">
                    <h2 className="text-sm font-display font-bold uppercase tracking-widest text-olive-800 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-olive-600" />
                        Health Timeline
                    </h2>
                    <Link href="/patient/scans" className="text-xs font-display uppercase tracking-widest text-olive-600 hover:text-olive-900">
                        View all →
                    </Link>
                </div>
                {recentScans.length > 0 ? (
                    <div className="space-y-3">
                        {recentScans.map((scan) => {
                            const Icon = MODALITY_ICONS[scan.modality] || Scan;
                            const statusCfg = STATUS_CONFIG[scan.status] || STATUS_CONFIG.pending;
                            const StatusIcon = statusCfg.icon;
                            // Status colors mapping to theme
                            let statusColor = "text-olive-600";
                            if (scan.status === 'completed') statusColor = "text-green-700";
                            if (scan.status === 'pending') statusColor = "text-yellow-700";
                            if (scan.status === 'processing') statusColor = "text-blue-700";

                            return (
                                <div
                                    key={scan.id}
                                    onClick={() => router.push(`/patient/scans/${scan.id}`)}
                                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-cream-200 cursor-pointer transition-colors border border-transparent hover:border-sage-200"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-olive-900 text-cream-50 flex items-center justify-center">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold font-display text-olive-900 uppercase tracking-wide">
                                            {scan.modality} Scan
                                        </p>
                                        <p className="text-xs text-olive-500 font-medium">
                                            {scan.aiDiagnosis || "Awaiting analysis"} •{" "}
                                            {new Date(scan.uploadedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider ${statusColor}`}>
                                        <StatusIcon className="w-3.5 h-3.5" />
                                        <span>{scan.status}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-olive-400">
                        <Scan className="w-12 h-12 mb-3 opacity-50" />
                        <p className="font-display text-sm tracking-wide">NO SCANS UPLOADED</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
    return (
        <div className="bento-card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-olive-800 text-cream-50 flex items-center justify-center">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <p className="text-3xl font-display font-medium text-olive-900">{value}</p>
                <p className="text-[10px] font-display uppercase tracking-widest text-olive-500">{label}</p>
            </div>
        </div>
    );
}

function QuickAction({ title, description, icon: Icon, href, color }: {
    title: string; description: string; icon: React.ElementType; href: string; color: string;
}) {
    return (
        <Link href={href} className={`${color} rounded-[20px] p-5 border transition-all hover:translate-y-[-2px] hover:shadow-sm group`}>
            <Icon className="w-6 h-6 mb-3 text-olive-700 group-hover:scale-110 transition-transform" />
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-olive-900">{title}</h3>
            <p className="text-xs font-medium text-olive-500 mt-1">{description}</p>
        </Link>
    );
}
