"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Send, Mail, MessageCircle, AlertTriangle, CheckCircle, Clock, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeliveriesPage() {
    const router = useRouter();
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [intents, setIntents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDeliveries = async () => {
            try {
                const res = await fetch("/api/deliveries");
                const data = await res.json();
                if (res.ok) {
                    setDeliveries(data.deliveries || []);
                    setIntents(data.intents || []);
                }
            } catch (error) {
                console.error("Error fetching deliveries:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDeliveries();
        const interval = setInterval(fetchDeliveries, 15000); // 15s polling
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex bg-cream-50 h-screen items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-olive-200 border-t-olive-900 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream-50 p-6 md:p-8 font-sans text-olive-900">
            <header className="mb-8 flex flex-col gap-2">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-olive-600 hover:text-olive-900 transition-colors w-fit font-display font-medium text-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h1 className="font-display text-3xl font-bold text-olive-900 tracking-tight">
                    Delivery & Setup Queue
                </h1>
                <p className="text-olive-600">Track outbound medical reports and inbound patient booking intents via WhatsApp.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Outbound Delivery Queue */}
                <div className="bg-white p-6 rounded-[20px] shadow-sm border border-sage-200">
                    <div className="flex items-center gap-3 mb-6">
                        <Send className="w-6 h-6 text-olive-600" />
                        <h2 className="text-xl font-display font-bold text-olive-900">Outbound Reports</h2>
                    </div>

                    <div className="space-y-4">
                        {deliveries.length === 0 ? (
                            <p className="text-olive-400 text-sm text-center py-8">No recent deliveries.</p>
                        ) : (
                            deliveries.map(d => (
                                <div key={d.id} className="p-4 rounded-xl border border-sage-100 bg-cream-50 flex items-start justify-between">
                                    <div className="flex gap-3">
                                        {d.channel === "email" ? (
                                            <Mail className="w-5 h-5 text-sage-500 mt-1" />
                                        ) : (
                                            <MessageCircle className="w-5 h-5 text-green-500 mt-1" />
                                        )}
                                        <div>
                                            <p className="font-bold text-olive-900 text-sm">{d.report?.patient?.name || "Patient"}</p>
                                            <p className="text-xs text-olive-500">Report #{d.reportId}</p>
                                            {d.errorMessage && (
                                                <p className="text-xs text-red-500 mt-1 max-w-xs">{d.errorMessage}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        {d.status === "sent" ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-md uppercase">
                                                <CheckCircle className="w-3 h-3" /> Sent
                                            </span>
                                        ) : d.status === "queued" || d.status === "processing" ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md uppercase">
                                                <Clock className="w-3 h-3" /> {d.status}
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-md uppercase">
                                                <AlertTriangle className="w-3 h-3" /> {d.status}
                                            </span>
                                        )}
                                        <p className="text-[10px] text-sage-400 mt-2">{new Date(d.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Inbound Booking Intents */}
                <div className="bg-white p-6 rounded-[20px] shadow-sm border border-sage-200">
                    <div className="flex items-center gap-3 mb-6">
                        <Calendar className="w-6 h-6 text-olive-600" />
                        <h2 className="text-xl font-display font-bold text-olive-900">WhatsApp Scheduling</h2>
                    </div>

                    <div className="space-y-4">
                        {intents.length === 0 ? (
                            <p className="text-olive-400 text-sm text-center py-8">No active booking requests.</p>
                        ) : (
                            intents.map(i => (
                                <div key={i.id} className="p-4 rounded-xl border border-sage-100 bg-cream-50 flex items-start justify-between">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 rounded-full bg-olive-100 flex items-center justify-center text-olive-700 font-bold text-xs flex-shrink-0">
                                            {i.patient?.name?.[0] || "?"}
                                        </div>
                                        <div>
                                            <p className="font-bold text-olive-900 text-sm">{i.patient?.name || "Patient"}</p>
                                            <p className="text-xs text-olive-500">Token: <span className="font-mono text-sage-600">{i.intentToken}</span></p>
                                            {i.selectedSlot && (
                                                <p className="text-xs font-bold text-olive-700 mt-1">Booked for {new Date(i.selectedSlot).toLocaleString()}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        {i.status === "booked" ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-olive-700 bg-olive-200 px-2 py-1 rounded-md uppercase tracking-wide">
                                                <CheckCircle className="w-3 h-3" /> Booked
                                            </span>
                                        ) : i.status === "offered" ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-md uppercase tracking-wide">
                                                Selecting Slot
                                            </span>
                                        ) : i.status === "pending" ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-sage-600 bg-sage-100 px-2 py-1 rounded-md uppercase tracking-wide">
                                                <Clock className="w-3 h-3" /> Waiting Reply
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-md uppercase tracking-wide">
                                                Expired
                                            </span>
                                        )}
                                        <p className="text-[10px] text-sage-400 mt-2">{new Date(i.createdAt).toLocaleString()}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
