"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Inbox, Filter, ChevronRight, Clock, AlertTriangle,
    CheckCircle2, Loader2, FileText, Stethoscope, User
} from "lucide-react";

type CaseStatus = "new" | "triaged" | "assigned" | "in_review" | "signed" | "released" | "closed";

interface Case_ {
    id: number;
    title: string;
    status: CaseStatus;
    priority: string;
    sourceRole: string;
    createdAt: string;
    patientId: number;
    hospitalId: number;
}

const TABS: { label: string; value: string }[] = [
    { label: "All", value: "" },
    { label: "Assigned", value: "assigned" },
    { label: "In Review", value: "in_review" },
    { label: "Signed", value: "signed" },
    { label: "Released", value: "released" },
];

const priorityColors: Record<string, string> = {
    low: "bg-cream-200 text-olive-500",
    medium: "bg-sage-200 text-olive-700",
    high: "bg-olive-200 text-olive-800",
    critical: "bg-red-100 text-red-700",
};

const statusColors: Record<string, string> = {
    new: "bg-cream-200 text-olive-500",
    triaged: "bg-cream-300 text-olive-600",
    assigned: "bg-sage-300 text-olive-900",
    in_review: "bg-olive-200 text-olive-800",
    signed: "bg-olive-800 text-cream-50",
    released: "bg-sage-400 text-olive-900",
    closed: "bg-cream-300 text-olive-400",
};

export default function DoctorCasesPage() {
    const router = useRouter();
    const [cases, setCases] = useState<Case_[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");

    const loadCases = async (status = "", priority = "") => {
        setLoading(true);
        const params = new URLSearchParams();
        if (status) params.set("status", status);
        if (priority) params.set("priority", priority);
        try {
            const res = await fetch(`/api/cases?${params.toString()}`);
            const data = await res.json();
            setCases(data.cases || []);
        } catch { }
        setLoading(false);
    };

    useEffect(() => { loadCases(activeTab, priorityFilter); }, [activeTab, priorityFilter]);

    return (
        <div className="min-h-screen bg-cream-50 p-6 md:p-8 font-sans text-olive-900">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-4xl md:text-5xl font-bold text-olive-900 tracking-tight leading-none mb-1">
                        Case Inbox
                    </h1>
                    <p className="text-olive-600 font-medium text-sm">{cases.length} cases loaded</p>
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-olive-400" />
                    {["", "low", "medium", "high", "critical"].map(p => (
                        <button
                            key={p}
                            onClick={() => setPriorityFilter(p)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-display uppercase tracking-widest transition ${priorityFilter === p ? "bg-olive-900 text-cream-50" : "bg-cream-100 text-olive-500 hover:bg-sage-200"}`}
                        >
                            {p || "All"}
                        </button>
                    ))}
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-cream-100 p-1 rounded-xl w-fit">
                {TABS.map(tab => (
                    <button
                        key={tab.value}
                        onClick={() => setActiveTab(tab.value)}
                        className={`px-4 py-2 rounded-lg font-display text-xs uppercase tracking-widest transition ${activeTab === tab.value ? "bg-olive-900 text-cream-50 shadow-sm" : "text-olive-500 hover:text-olive-900"}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Cases Table */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-olive-800 animate-spin" />
                </div>
            ) : cases.length === 0 ? (
                <div className="bento-card flex flex-col items-center justify-center py-20 text-olive-400">
                    <Inbox className="w-12 h-12 mb-4 opacity-40" />
                    <p className="font-display text-sm uppercase tracking-wider">No cases found</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {cases.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => router.push(`/doctor/cases/${c.id}`)}
                            className="w-full bento-card flex items-center gap-4 hover:bg-sage-50 transition text-left group py-4"
                        >
                            {/* Priority dot */}
                            <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${c.priority === "critical" ? "bg-red-500 animate-pulse" : c.priority === "high" ? "bg-olive-600" : "bg-sage-400"}`} />

                            {/* Case info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-display text-sm font-bold text-olive-900 truncate">
                                    {c.title || `Case #${c.id}`}
                                </p>
                                <div className="flex items-center gap-3 mt-0.5">
                                    <span className="font-display text-[10px] uppercase tracking-widest text-olive-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />{new Date(c.createdAt).toLocaleDateString()}
                                    </span>
                                    <span className="font-display text-[10px] uppercase tracking-widest text-olive-400">
                                        via {c.sourceRole}
                                    </span>
                                </div>
                            </div>

                            {/* Status + Priority */}
                            <div className="flex items-center gap-2 shrink-0">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-widest ${priorityColors[c.priority] || "bg-cream-200 text-olive-500"}`}>
                                    {c.priority}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-widest ${statusColors[c.status] || ""}`}>
                                    {c.status.replace("_", " ")}
                                </span>
                                <ChevronRight className="w-4 h-4 text-olive-300 group-hover:text-olive-800 transition" />
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
