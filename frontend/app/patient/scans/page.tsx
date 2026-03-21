"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    Scan,
    Clock,
    CheckCircle,
    XCircle,
    RefreshCw,
    Eye,
    Brain,
    HeartPulse,
    Stethoscope,
} from "lucide-react";
import { scansApi } from "@/lib/api/scans";

interface ScanItem {
    id: number;
    imageUrl: string;
    modality: string;
    status: string;
    aiDiagnosis: string | null;
    aiConfidence: number | null;
    uploadedAt: string;
}

const MODALITY_ICONS: Record<string, React.ElementType> = {
    brain: Brain,
    lung: Stethoscope,
    skin: Scan,
    ecg: HeartPulse,
};

const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
};

export default function PatientScansPage() {
    const router = useRouter();
    const [scans, setScans] = useState<ScanItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchScans();
    }, []);

    async function fetchScans() {
        setLoading(true);
        try {
            const data = await scansApi.list();
            setScans(data.scans || []);
        } catch (err) {
            console.error("Failed to fetch scans:", err);
        }
        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-olive-200 border-t-olive-800 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-bold text-olive-900">My Scans</h1>
                    <p className="text-olive-500 text-sm mt-1">
                        Track and view all your uploaded medical scans
                    </p>
                </div>
                <button
                    onClick={fetchScans}
                    className="flex items-center gap-2 px-4 py-2 bg-cream-100 border border-sage-300 rounded-xl text-sm font-display font-bold uppercase tracking-wider text-olive-700 hover:bg-sage-100 transition"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            {scans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-olive-400">
                    <Scan className="w-16 h-16 mb-4 opacity-40" />
                    <p className="text-lg font-display font-bold">No scans yet</p>
                    <p className="text-sm mt-1">Upload your first medical scan to get started</p>
                    <button
                        onClick={() => router.push("/patient/upload")}
                        className="mt-4 px-6 py-2 bg-olive-800 text-cream-50 rounded-xl text-sm font-display font-bold uppercase tracking-wider hover:bg-olive-900 transition"
                    >
                        Upload Scan
                    </button>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {scans.map((scan) => {
                        const ModalityIcon = MODALITY_ICONS[scan.modality] || Scan;
                        return (
                            <div
                                key={scan.id}
                                className="bg-cream-100 rounded-[20px] border border-sage-300 border-dashed overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => router.push(`/patient/scans/${scan.id}`)}
                            >
                                <div className="h-48 bg-sage-100">
                                    <img
                                        src={scan.imageUrl}
                                        alt="Scan"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-sage-200 text-olive-700">
                                            <ModalityIcon className="w-3 h-3" />
                                            {scan.modality.toUpperCase()}
                                        </span>
                                        <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[scan.status]}`}
                                        >
                                            {scan.status}
                                        </span>
                                    </div>
                                    {scan.aiDiagnosis && (
                                        <p className="text-sm font-display font-bold text-olive-900">
                                            {scan.aiDiagnosis}
                                            {scan.aiConfidence && (
                                                <span className="text-olive-400 font-normal ml-1">
                                                    ({(scan.aiConfidence * 100).toFixed(0)}%)
                                                </span>
                                            )}
                                        </p>
                                    )}
                                    <p className="text-xs text-olive-400 mt-1">
                                        {new Date(scan.uploadedAt).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
