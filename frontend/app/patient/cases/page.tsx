"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Building2, Clock, Loader2, FolderOpen } from "lucide-react";
import { casesApi } from "@/lib/api/cases";

interface Case_ {
    id: number;
    title?: string;
    status: string;
    releasedAt?: string;
    createdAt: string;
    hospital?: { name: string; city: string; logoUrl?: string };
}

export default function PatientCasesPage() {
    const router = useRouter();
    const [cases, setCases] = useState<Case_[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        casesApi
            .list()
            .then(d => { setCases(d.cases || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-cream-50">
            <Loader2 className="w-10 h-10 text-olive-900 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-cream-50 p-6 md:p-8 font-sans text-olive-900">
            <header className="mb-8">
                <h1 className="font-display text-4xl md:text-5xl font-bold text-olive-900 tracking-tight leading-none mb-1">
                    My Medical Records
                </h1>
                <p className="text-olive-600 font-medium text-sm">
                    Released reports and diagnostic summaries from your care team.
                </p>
            </header>

            {cases.length === 0 ? (
                <div className="bento-card flex flex-col items-center justify-center py-20 text-olive-400">
                    <FolderOpen className="w-12 h-12 mb-4 opacity-40" />
                    <p className="font-display text-sm uppercase tracking-wider">No released records yet</p>
                    <p className="font-display text-xs text-olive-400 mt-2 text-center max-w-xs">
                        Your doctor will share reports here once they've been reviewed and released.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {cases.map(c => (
                        <button
                            key={c.id}
                            onClick={() => router.push(`/patient/cases/${c.id}`)}
                            className="bento-card text-left hover:bg-sage-50 transition group flex flex-col gap-3"
                        >
                            {/* Hospital badge */}
                            {c.hospital && (
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-olive-900 flex items-center justify-center shrink-0">
                                        {c.hospital.logoUrl ? (
                                            <img src={c.hospital.logoUrl} alt="Hospital" className="w-6 h-6 object-contain rounded" />
                                        ) : (
                                            <Building2 className="w-4 h-4 text-cream-50" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-display text-[10px] uppercase tracking-widest text-olive-500 font-bold">{c.hospital.name}</p>
                                        <p className="font-display text-[9px] uppercase tracking-widest text-olive-400">{c.hospital.city}</p>
                                    </div>
                                </div>
                            )}

                            {/* Title */}
                            <div>
                                <p className="font-display text-sm font-bold text-olive-900 leading-tight">
                                    {c.title || `Medical Record #${c.id}`}
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between mt-auto pt-3 border-t border-sage-200 border-dashed">
                                <span className="font-display text-[10px] uppercase tracking-widest text-olive-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Released {c.releasedAt ? new Date(c.releasedAt).toLocaleDateString() : "—"}
                                </span>
                                <span className="font-display text-[10px] uppercase tracking-widest text-sage-600 group-hover:text-olive-900 transition">
                                    View →
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
