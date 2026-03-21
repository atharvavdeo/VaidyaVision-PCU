"use client";

import { useEffect, useState } from "react";
import { Building2, Star, Loader2, CheckCircle2 } from "lucide-react";
import { membershipsApi } from "@/lib/api/memberships";

interface Membership {
    id: number;
    hospitalId: number;
    membershipRole: string;
    status: string;
    isPrimary: boolean;
    hospital: { id: number; name: string; city: string; code: string; logoUrl?: string };
    specialty?: { id: number; name: string } | null;
}

export default function DoctorHospitalSettingsPage() {
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<number | null>(null);
    const [msg, setMsg] = useState("");

    useEffect(() => {
        membershipsApi
            .list()
            .then((d) => {
                setMemberships(d.memberships || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const setPrimary = async (membershipId: number) => {
        setSaving(membershipId);
        try {
            const data = await membershipsApi.update({ membershipId, isPrimary: true });
            if (data?.membership) {
                setMemberships(prev => prev.map(m => ({ ...m, isPrimary: m.id === membershipId })));
                setMsg("Primary hospital updated.");
            } else {
                setMsg(data?.error || "Error updating");
            }
        } catch { setMsg("Error"); }
        setSaving(null);
        setTimeout(() => setMsg(""), 3000);
    };

    if (loading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-olive-900 animate-spin" />
        </div>
    );

    return (
        <div className="min-h-screen bg-cream-50 p-6 md:p-8 font-sans text-olive-900">
            <header className="mb-8">
                <h1 className="font-display text-4xl font-bold text-olive-900 tracking-tight leading-none mb-1">
                    Hospital Memberships
                </h1>
                <p className="text-olive-600 font-medium text-sm">
                    Manage your hospital affiliations. Your primary hospital determines which cases you see by default.
                </p>
            </header>

            {msg && (
                <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-sage-100 text-olive-800 rounded-xl font-display text-xs uppercase tracking-widest">
                    <CheckCircle2 className="w-4 h-4" /> {msg}
                </div>
            )}

            {memberships.length === 0 ? (
                <div className="bento-card flex flex-col items-center justify-center py-16 text-olive-400">
                    <Building2 className="w-12 h-12 mb-4 opacity-40" />
                    <p className="font-display text-sm uppercase tracking-wider">No hospital memberships found</p>
                    <p className="font-display text-xs text-olive-400 mt-2">Contact your hospital admin to be onboarded.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {memberships.map(m => (
                        <div
                            key={m.id}
                            className={`bento-card flex items-center gap-4 ${m.isPrimary ? "ring-2 ring-olive-800 ring-offset-2 ring-offset-cream-50" : ""}`}
                        >
                            {/* Logo / Icon */}
                            <div className="w-12 h-12 rounded-xl bg-olive-900 flex items-center justify-center shrink-0">
                                {m.hospital.logoUrl ? (
                                    <img src={m.hospital.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
                                ) : (
                                    <Building2 className="w-6 h-6 text-cream-50" />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-display text-sm font-bold text-olive-900 truncate">{m.hospital.name}</p>
                                    {m.isPrimary && (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-display font-bold uppercase tracking-widest bg-olivet-800 bg-olive-900 text-cream-50 flex items-center gap-1">
                                            <Star className="w-2.5 h-2.5" /> Primary
                                        </span>
                                    )}
                                </div>
                                <p className="font-display text-[10px] uppercase tracking-widest text-olive-400 mt-0.5">
                                    {m.hospital.city} · {m.hospital.code} · {m.membershipRole.replace("_", " ")}
                                    {m.specialty ? ` · ${m.specialty.name}` : ""}
                                </p>
                                <p className="font-display text-[9px] uppercase tracking-widest text-olive-400">Status: {m.status}</p>
                            </div>

                            {/* Action */}
                            {!m.isPrimary && (
                                <button
                                    onClick={() => setPrimary(m.id)}
                                    disabled={saving === m.id}
                                    className="shrink-0 px-4 py-2 bg-cream-100 text-olive-700 rounded-xl font-display text-[10px] uppercase tracking-widest hover:bg-sage-200 transition disabled:opacity-50 border border-sage-300 border-dashed flex items-center gap-1"
                                >
                                    {saving === m.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />}
                                    Set Primary
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
