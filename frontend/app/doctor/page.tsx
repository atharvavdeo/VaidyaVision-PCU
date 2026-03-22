"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
    Activity,
    Users,
    FileText,
    TrendingUp,
    Clock,
    Calendar,
    ArrowUpRight,
    AlertTriangle,
    CheckCircle,
    Plus,
    Search,
    ChevronDown,
    Loader2
} from "lucide-react";

interface Appointment {
    id: number;
    scheduledAt: string;
    type: string;
    status: string;
    notes: string | null;
    patient: { name: string } | null;
    doctor: { name: string } | null;
}

export default function DoctorDashboard() {
    const { user } = useUser();
    const router = useRouter();
    const [stats, setStats] = useState<any>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const [statsRes, aptsRes] = await Promise.all([
                fetch("/api/doctor/stats"),
                fetch("/api/appointments"),
            ]);
            const data = await statsRes.json();
            const aptsData = await aptsRes.json();
            setStats(data);
            setAppointments(aptsData.appointments || []);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch stats:", error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        // Auto-refresh every 5 seconds
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    const currentDate = new Date().toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });

    if (loading && !stats) {
        return (
            <div className="min-h-screen bg-cream-50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-olive-900 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream-50 p-6 md:p-8 font-sans text-olive-900">
            {/* Header Section */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-4xl md:text-5xl font-bold text-olive-900 tracking-tight leading-none mb-1">
                        Today's Overview
                    </h1>
                    <p className="text-olive-700 font-medium">
                        Hello, Dr. {user?.firstName || "Doctor"}! You have{" "}
                        <span className="font-bold border-b border-olive-700 border-dashed">
                            {stats?.pending || 0} pending scans.
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-olive-400" />
                        <input
                            type="text"
                            placeholder="SEARCH PATIENTS..."
                            className="pl-9 pr-4 py-2 bg-cream-100 border border-sage-300 border-dashed rounded-lg text-xs font-display tracking-widest text-olive-800 placeholder:text-olive-400 focus:outline-none focus:border-olive-800 uppercase w-64 transition-colors"
                        />
                    </div>
                    <button className="bg-olive-800 text-cream-50 px-4 py-2 rounded-lg font-display text-xs font-medium tracking-widest uppercase hover:bg-olive-900 transition flex items-center gap-2">
                        {stats?.critical || 0} Critical <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    </button>
                    <button className="bg-sage-400 text-olive-900 px-4 py-2 rounded-lg font-display text-xs font-medium tracking-widest uppercase hover:bg-sage-500 transition border border-sage-500">
                        Today <ChevronDown className="w-4 h-4 inline ml-1" />
                    </button>
                </div>
            </header>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-min">

                {/* 1. Quick Access (Dark Card) */}
                <div className="col-span-1 lg:row-span-2 bg-olive-900 rounded-[20px] p-8 text-cream-50 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-olive-700/20 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-olive-600/20" />

                    <div>
                        <h2 className="font-display text-xs uppercase tracking-[0.2em] text-olive-300 border-b border-olive-700 pb-4 mb-6">
                            Quick Access
                        </h2>
                        <ul className="space-y-4 font-display text-sm tracking-wide">
                            <li>
                                <button onClick={() => router.push("/doctor/appointments")} className="flex items-center gap-3 hover:text-sage-400 transition-colors w-full text-left">
                                    <span className="text-olive-400">[+]</span> NEW APPOINTMENT
                                </button>
                            </li>
                            <li>
                                <button onClick={() => router.push("/doctor/patients")} className="flex items-center gap-3 hover:text-sage-400 transition-colors w-full text-left">
                                    <span className="text-olive-400">[↗]</span> ALL PATIENTS
                                </button>
                            </li>
                            <li>
                                <button onClick={() => router.push("/doctor/reports")} className="flex items-center gap-3 hover:text-sage-400 transition-colors w-full text-left">
                                    <span className="text-olive-400">[↗]</span> GENERATE REPORT
                                </button>
                            </li>
                            <li>
                                <button onClick={() => router.push("/doctor/queue")} className="flex items-center gap-3 text-sage-400 font-bold w-full text-left">
                                    <span className="text-sage-400">[↗]</span> REVIEW SCANS
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* 2. Ready for Review */}
                <div className="bento-card col-span-1 min-h-[240px] flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="bento-title w-auto border-none mb-0 pb-0">READY FOR REVIEW</h2>
                            <div className="w-2 h-2 rounded-full bg-olive-800" />
                        </div>
                        <div className="w-full border-b border-sage-300 border-dashed mb-4" />
                    </div>

                    <div className="flex items-end justify-between font-display">
                        <span className="text-8xl font-medium text-olive-900 leading-none -ml-1">
                            {stats?.pending ? String(stats.pending).padStart(2, '0') : "00"}
                        </span>
                    </div>

                    <div className="space-y-2 mt-4 max-h-[100px] overflow-y-auto custom-scrollbar">
                        {stats?.pendingScans?.length > 0 ? (
                            stats.pendingScans.map((scan: any) => (
                                <div key={scan.id} className="flex justify-between text-xs font-display tracking-wide border-b border-sage-200 border-dashed pb-1">
                                    <span className="truncate max-w-[120px]">{scan.patient?.name || "Unknown"}</span>
                                    <span
                                        onClick={() => router.push(`/doctor/scan/${scan.id}`)}
                                        className="text-olive-500 cursor-pointer hover:text-olive-900 whitespace-nowrap"
                                    >
                                        [VIEW ↗]
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-xs text-olive-400 font-display">No pending scans</div>
                        )}
                    </div>
                </div>

                {/* 3. High Risk Patients */}
                <div className="bento-card col-span-1 lg:col-span-1 min-h-[240px] bg-cream-50 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <h2 className="bento-title w-auto border-none mb-0 pb-0">HIGH-RISK PATIENTS</h2>
                            <div className="w-2 h-2 rounded-full bg-red-800 animate-pulse" />
                        </div>
                        <div className="w-full border-b border-sage-300 border-dashed mb-4" />
                    </div>

                    <div className="flex items-end justify-between font-display">
                        <span className="text-8xl font-medium text-olive-900 leading-none -ml-1">
                            {stats?.critical ? String(stats.critical).padStart(2, '0') : "00"}
                        </span>
                    </div>

                    <div className="space-y-2 mt-4 max-h-[100px] overflow-y-auto custom-scrollbar">
                        {stats?.highRiskScans?.length > 0 ? (
                            stats.highRiskScans.map((scan: any) => (
                                <div key={scan.id} className="flex justify-between text-xs font-display tracking-wide border-b border-sage-200 border-dashed pb-1 text-red-800">
                                    <span className="truncate max-w-[120px]">{scan.patient?.name?.split(' ')[0] || "Unknown"} | {scan.modality?.toUpperCase()}</span>
                                    <span
                                        onClick={() => router.push(`/doctor/scan/${scan.id}`)}
                                        className="cursor-pointer hover:text-red-950 whitespace-nowrap"
                                    >
                                        [VIEW ↗]
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="text-xs text-olive-400 font-display">No high risk patients</div>
                        )}
                    </div>
                </div>

                {/* 4. Time to Insight (Chart Placeholder) */}
                <div className="bento-card col-span-1 bg-sage-300 min-h-[240px] flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                        <h2 className="font-display font-medium text-xs uppercase tracking-[0.2em] text-olive-800">TIME TO INSIGHT</h2>
                        <span className="font-display text-[10px] uppercase tracking-wider text-olive-600">WEEKLY AVG</span>
                    </div>
                    <div className="w-full border-b border-olive-800/20 border-dashed mb-4" />

                    <div className="flex-1 flex items-end justify-between gap-1 pb-2">
                        {/* Dot matrix chart bars */}
                        {[40, 60, 45, 80, 100, 90, 50].map((h, i) => (
                            <div key={i} className="flex flex-col gap-1 items-center w-full">
                                <div className="w-full font-mono text-[9px] text-olive-700 text-center mb-1">
                                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                                </div>
                                <div className="flex flex-col-reverse gap-1 h-32 w-4">
                                    {Array.from({ length: 10 }).map((_, j) => (
                                        <div
                                            key={j}
                                            className={`w-3 h-3 rounded-full ${j * 10 < h ? 'bg-olive-800' : 'bg-olive-800/10'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. Today's Schedule (Real Appointments) */}
                <div className="bento-card col-span-1 lg:row-span-2 min-h-[400px]">
                    <h2 className="bento-title">TODAY&apos;S SCHEDULE</h2>
                    <div className="space-y-3">
                        {(() => {
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const tomorrow = new Date(today);
                            tomorrow.setDate(tomorrow.getDate() + 1);
                            const todaysApts = appointments
                                .filter(a => {
                                    const d = new Date(a.scheduledAt);
                                    return d >= today && d < tomorrow && a.status !== 'cancelled';
                                })
                                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
                            
                            if (todaysApts.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-12 text-olive-400">
                                        <Calendar className="w-10 h-10 mb-3 opacity-50" />
                                        <p className="font-display text-xs tracking-wide uppercase">No appointments today</p>
                                        <button onClick={() => router.push("/doctor/appointments")} className="mt-3 text-xs text-olive-600 hover:text-olive-900 font-display uppercase tracking-wider underline underline-offset-4">
                                            Schedule One
                                        </button>
                                    </div>
                                );
                            }
                            return todaysApts.map((apt, i) => {
                                const time = new Date(apt.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const isFilled = apt.status === 'confirmed' || apt.status === 'completed';
                                return (
                                    <div key={apt.id} className={`p-4 rounded-2xl flex items-center justify-between border ${isFilled ? 'bg-olive-900 border-olive-900 text-cream-50' : 'bg-cream-50 border-sage-300 border-dashed text-olive-900'}`}>
                                        <div>
                                            <span className={`font-display text-lg font-medium ${isFilled ? 'text-cream-50' : 'text-olive-900'}`}>
                                                {time}
                                            </span>
                                            <p className={`text-xs font-display uppercase tracking-wider mt-0.5 ${isFilled ? 'text-olive-300' : 'text-olive-500'}`}>
                                                {apt.patient?.name || 'Patient'} · {apt.type.replace('_', ' ')}
                                            </p>
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isFilled ? 'text-sage-400' : 'text-olive-400'}`}>
                                            {apt.status}
                                        </span>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* 6. Upcoming Appointments */}
                <div className="bento-card col-span-1 lg:col-span-2 min-h-[300px] bg-cream-100 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="bento-title w-auto border-none m-0 p-0">UPCOMING APPOINTMENTS</h2>
                        <button onClick={() => router.push("/doctor/appointments")} className="font-display text-[10px] uppercase tracking-wider text-olive-600 hover:text-olive-900">
                            View all →
                        </button>
                    </div>
                    <div className="w-full border-b border-sage-300 border-dashed mb-4" />

                    <div className="space-y-3 flex-1 overflow-y-auto">
                        {(() => {
                            const upcoming = appointments
                                .filter(a => new Date(a.scheduledAt) >= new Date() && a.status !== 'cancelled')
                                .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                                .slice(0, 6);

                            if (upcoming.length === 0) {
                                return (
                                    <div className="flex flex-col items-center justify-center py-8 text-olive-400">
                                        <p className="font-display text-xs uppercase tracking-wider">No upcoming appointments</p>
                                    </div>
                                );
                            }

                            return upcoming.map(apt => {
                                const d = new Date(apt.scheduledAt);
                                const statusColor = apt.status === 'confirmed' ? 'bg-sage-400 text-olive-900' : 'bg-cream-200 text-olive-600';
                                return (
                                    <div key={apt.id} className="flex items-center justify-between p-3 rounded-xl border border-sage-200 border-dashed hover:bg-cream-200 transition">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-olive-800 text-cream-50 flex items-center justify-center font-display font-bold text-xs">
                                                {d.getDate()}
                                                <br />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold font-display text-olive-900">{apt.patient?.name || 'Patient'}</p>
                                                <p className="text-[10px] text-olive-500 font-display uppercase tracking-wider">
                                                    {d.toLocaleDateString()} · {d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · {apt.type.replace('_',' ')}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                                            {apt.status}
                                        </span>
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* 7. Today's Results */}
                <div className="bento-card col-span-1 min-h-[300px] bg-cream-50 flex flex-col justify-between">
                    <h2 className="bento-title">TODAY'S RESULTS</h2>

                    <div className="space-y-1">
                        <div className="bg-cream-50 border border-sage-200 border-dashed rounded-xl p-4 flex justify-between items-center">
                            <span className="font-display text-5xl font-medium text-olive-900">
                                {stats?.reviewedToday || 0}
                            </span>
                            <span className="font-display text-xs uppercase tracking-widest text-olive-500">REVIEWED</span>
                        </div>
                        <div className="bg-sage-300 border-none rounded-xl p-4 flex justify-between items-center">
                            <span className="font-display text-5xl font-medium text-olive-900">
                                {stats?.critical || 0}
                            </span>
                            <span className="font-display text-xs uppercase tracking-widest text-olive-800">CRITICAL</span>
                        </div>
                        <div className="bg-cream-50 border-none rounded-xl p-4 flex justify-between items-center">
                            <span className="font-display text-5xl font-medium text-olive-900">
                                {stats?.pending || 0}
                            </span>
                            <span className="font-display text-xs uppercase tracking-widest text-olive-500">PENDING</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
