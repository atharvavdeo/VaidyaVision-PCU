"use client";

import { useState, useEffect } from "react";
import {
    Calendar, Clock, CheckCircle, XCircle, User, Plus, X, Search, Filter, ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Appointment {
    id: number;
    scheduledAt: string;
    type: string;
    status: string;
    notes: string | null;
    patient: { id: number; name: string; imageUrl: string | null };
    doctor: { id: number; name: string; imageUrl: string | null };
}

interface AppointmentPageProps {
    userRole: "doctor" | "patient";
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ElementType; border: string }> = {
    scheduled: { bg: "bg-blue-50", text: "text-blue-700", icon: Clock, border: "border-blue-200" },
    confirmed: { bg: "bg-olive-100", text: "text-olive-800", icon: CheckCircle, border: "border-olive-200" },
    completed: { bg: "bg-sage-100", text: "text-sage-700", icon: CheckCircle, border: "border-sage-200" },
    cancelled: { bg: "bg-red-50", text: "text-red-700", icon: XCircle, border: "border-red-200" },
};

export default function AppointmentView({ userRole }: AppointmentPageProps) {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        scheduledAt: "",
        type: "follow_up",
        notes: "",
        otherUserId: "",
    });

    useEffect(() => {
        fetchAppointments();
    }, []);

    async function fetchAppointments() {
        try {
            const res = await fetch("/api/appointments");
            const data = await res.json();
            setAppointments(data.appointments || []);
        } catch (err) {
            console.error("Failed to load appointments:", err);
        }
        setLoading(false);
    }

    async function createAppointment() {
        try {
            const body: Record<string, any> = {
                scheduledAt: formData.scheduledAt,
                type: formData.type,
                notes: formData.notes || null,
            };
            if (userRole === "doctor") body.patientId = parseInt(formData.otherUserId);
            else body.doctorId = parseInt(formData.otherUserId);

            await fetch("/api/appointments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            setShowForm(false);
            setFormData({ scheduledAt: "", type: "follow_up", notes: "", otherUserId: "" });
            fetchAppointments();
        } catch (err) {
            console.error("Create error:", err);
            alert("Failed to schedule. Please check the ID and try again.");
        }
    }

    async function updateStatus(id: number, status: string) {
        try {
            await fetch("/api/appointments", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appointmentId: id, status }),
            });
            fetchAppointments();
        } catch (err) {
            console.error("Update error:", err);
        }
    }

    const upcoming = appointments.filter(
        (a) => a.status === "scheduled" || a.status === "confirmed"
    );
    const past = appointments.filter(
        (a) => a.status === "completed" || a.status === "cancelled"
    );

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="w-8 h-8 border-4 border-olive-200 border-t-olive-800 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen font-sans text-olive-900">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="font-display text-3xl font-bold text-olive-900 tracking-tight">
                        Appointments
                    </h1>
                    <p className="text-olive-600">
                        Manage your upcoming sessions and patient consultations.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-olive-800 text-cream-50 rounded-xl font-display text-sm font-bold tracking-wide uppercase hover:bg-olive-900 transition shadow-lg shadow-olive-800/20"
                >
                    <Plus className="w-4 h-4" />
                    New Appointment
                </button>
            </div>

            {/* Modal */}
            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-olive-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-white/20 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-display font-bold text-olive-900">Schedule Appointment</h3>
                            <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-sage-100 text-olive-500 transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-olive-500 uppercase tracking-wider mb-1 block">
                                    {userRole === "doctor" ? "Patient ID" : "Doctor ID"}
                                </label>
                                <input
                                    type="number"
                                    value={formData.otherUserId}
                                    onChange={(e) => setFormData({ ...formData, otherUserId: e.target.value })}
                                    className="w-full px-4 py-3 bg-cream-50 border border-sage-200 rounded-xl focus:outline-none focus:border-olive-500 focus:ring-1 focus:ring-olive-500 transition"
                                    placeholder="Enter user ID"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-olive-500 uppercase tracking-wider mb-1 block">Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={formData.scheduledAt}
                                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                                    className="w-full px-4 py-3 bg-cream-50 border border-sage-200 rounded-xl focus:outline-none focus:border-olive-500 focus:ring-1 focus:ring-olive-500 transition"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-olive-500 uppercase tracking-wider mb-1 block">Type</label>
                                <div className="relative">
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-4 py-3 bg-cream-50 border border-sage-200 rounded-xl focus:outline-none focus:border-olive-500 focus:ring-1 focus:ring-olive-500 transition appearance-none"
                                    >
                                        <option value="follow_up">Follow Up</option>
                                        <option value="initial">Initial Consultation</option>
                                        <option value="emergency">Emergency</option>
                                        <option value="review">Scan Review</option>
                                    </select>
                                    <ChevronRight className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-olive-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-olive-500 uppercase tracking-wider mb-1 block">Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-cream-50 border border-sage-200 rounded-xl focus:outline-none focus:border-olive-500 focus:ring-1 focus:ring-olive-500 transition resize-none"
                                    placeholder="Add any details..."
                                />
                            </div>
                            <button
                                onClick={createAppointment}
                                disabled={!formData.scheduledAt || !formData.otherUserId}
                                className="w-full py-3.5 bg-olive-800 text-cream-50 rounded-xl font-bold tracking-wide uppercase hover:bg-olive-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                            >
                                Confirm Schedule
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-8">
                {/* Upcoming Section */}
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-sage-200 border-dashed" />
                        <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-olive-500">
                            Upcoming ({upcoming.length})
                        </h2>
                        <div className="h-px flex-1 bg-sage-200 border-dashed" />
                    </div>

                    {upcoming.length === 0 ? (
                        <EmptyState text="No upcoming appointments scheduled." />
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {upcoming.map((apt) => (
                                <AppointmentCard
                                    key={apt.id}
                                    apt={apt}
                                    userRole={userRole}
                                    onConfirm={() => updateStatus(apt.id, "confirmed")}
                                    onComplete={() => updateStatus(apt.id, "completed")}
                                    onCancel={() => updateStatus(apt.id, "cancelled")}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Past Section */}
                {past.length > 0 && (
                    <section>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-px flex-1 bg-sage-200 border-dashed" />
                            <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-olive-400">
                                Past History
                            </h2>
                            <div className="h-px flex-1 bg-sage-200 border-dashed" />
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 opacity-75">
                            {past.map((apt) => (
                                <AppointmentCard key={apt.id} apt={apt} userRole={userRole} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="bg-white rounded-2xl border border-sage-200 border-dashed p-10 text-center">
            <div className="w-16 h-16 bg-sage-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-sage-400" />
            </div>
            <p className="text-olive-600 font-medium">{text}</p>
        </div>
    );
}

function AppointmentCard({
    apt,
    userRole,
    onConfirm,
    onComplete,
    onCancel,
}: {
    apt: Appointment;
    userRole: string;
    onConfirm?: () => void;
    onComplete?: () => void;
    onCancel?: () => void;
}) {
    const st = STATUS_STYLES[apt.status] || STATUS_STYLES.scheduled;
    const StIcon = st.icon;
    const other = userRole === "doctor" ? apt.patient : apt.doctor;
    const dateObj = new Date(apt.scheduledAt);

    return (
        <div className="bg-white rounded-xl border border-sage-100 p-5 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sage-100 flex items-center justify-center flex-shrink-0 text-olive-700 font-bold font-display text-lg">
                        {other?.name?.[0] || <User className="w-6 h-6" />}
                    </div>
                    <div>
                        <h3 className="font-display font-bold text-olive-900 text-lg leading-tight">
                            {other?.name || "Unknown User"}
                        </h3>
                        <p className="text-olive-500 text-sm mb-2">{apt.type.replace("_", " ").toUpperCase()}</p>

                        <div className="flex flex-wrap gap-2 text-xs font-medium text-olive-600">
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-cream-100 rounded-md">
                                <Calendar className="w-3.5 h-3.5" />
                                {dateObj.toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-cream-100 rounded-md">
                                <Clock className="w-3.5 h-3.5" />
                                {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border ${st.bg} ${st.text} ${st.border}`}>
                    <StIcon className="w-3.5 h-3.5" />
                    {apt.status}
                </div>
            </div>

            {apt.notes && (
                <div className="mt-4 p-3 bg-cream-50 rounded-lg text-sm text-olive-700 italic border-l-2 border-sage-300">
                    "{apt.notes}"
                </div>
            )}

            {(onConfirm || onComplete || onCancel) && (
                <div className="mt-5 pt-4 border-t border-sage-100 flex gap-2 justify-end">
                    {apt.status === "scheduled" && onConfirm && (
                        <button onClick={onConfirm} className="px-4 py-2 bg-olive-100 text-olive-800 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-olive-200 transition">
                            Confirm
                        </button>
                    )}
                    {(apt.status === "scheduled" || apt.status === "confirmed") && onComplete && (
                        <button onClick={onComplete} className="px-4 py-2 bg-olive-800 text-cream-50 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-olive-900 transition">
                            Complete
                        </button>
                    )}
                    {apt.status !== "completed" && apt.status !== "cancelled" && onCancel && (
                        <button onClick={onCancel} className="px-4 py-2 bg-white border border-sage-200 text-sage-600 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition">
                            Cancel
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
