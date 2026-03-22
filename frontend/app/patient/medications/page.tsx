"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Pill, Clock, CheckCircle, XCircle, Plus, Trash2,
    Loader2, AlertCircle, Sun, Sunset, Moon, CloudSun,
    Calendar, ChevronDown, ChevronUp, Gamepad2,
} from "lucide-react";
import PillTicTacToe from "@/components/games/PillTicTacToe";

interface Medication {
    id: number;
    drugName: string;
    dosage: string | null;
    form: string | null;
    frequency: string | null;
    timeOfDay: string | null;
    duration: string | null;
    startDate: string | null;
    endDate: string | null;
    instructions: string | null;
    isActive: boolean;
    addedBy: string;
    prescriptionId: number | null;
    createdAt: string;
}

interface MedLog {
    id: number;
    medicationId: number;
    status: string;
    scheduledTime: string | null;
    logDate: string;
}

const TIME_SLOTS = [
    { key: "morning", label: "Morning", icon: Sun, time: "8:00 AM", color: "amber" },
    { key: "afternoon", label: "Afternoon", icon: CloudSun, time: "1:00 PM", color: "orange" },
    { key: "evening", label: "Evening", icon: Sunset, time: "6:00 PM", color: "rose" },
    { key: "night", label: "Night", icon: Moon, time: "10:00 PM", color: "indigo" },
];

export default function MedicationsPage() {
    const [medications, setMedications] = useState<Medication[]>([]);
    const [logs, setLogs] = useState<MedLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [expandedSlot, setExpandedSlot] = useState<string | null>(null);
    const [loggingId, setLoggingId] = useState<string | null>(null);

    // Add form state
    const [newMed, setNewMed] = useState({
        drugName: "", dosage: "", form: "tablet", frequency: "once daily",
        timeOfDay: ["morning"] as string[], duration: "", instructions: "",
    });
    const [addingMed, setAddingMed] = useState(false);

    const fetchMedications = useCallback(async () => {
        try {
            const res = await fetch("/api/medications");
            if (res.ok) {
                const data = await res.json();
                setMedications(data.medications);
                setLogs(data.todayLogs);
            }
        } catch (err) {
            console.error("Failed to fetch medications", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchMedications(); }, [fetchMedications]);

    const activeMeds = medications.filter((m) => m.isActive);

    // Group medications by time slot
    const getMedsForSlot = (slot: string) => {
        return activeMeds.filter((m) => {
            try {
                const times = m.timeOfDay ? JSON.parse(m.timeOfDay) : ["morning"];
                return times.includes(slot);
            } catch {
                return slot === "morning";
            }
        });
    };

    // Check if a medication has been logged for a time slot today
    const getLogStatus = (medId: number, slot: string) => {
        return logs.find((l) => l.medicationId === medId && l.scheduledTime === slot);
    };

    const logMedication = async (medId: number, slot: string, status: "taken" | "missed" | "skipped") => {
        const key = `${medId}-${slot}`;
        setLoggingId(key);
        try {
            await fetch("/api/medications/log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ medicationId: medId, status, scheduledTime: slot }),
            });
            await fetchMedications();
        } catch (err) {
            console.error("Failed to log medication", err);
        } finally {
            setLoggingId(null);
        }
    };

    const addMedication = async () => {
        if (!newMed.drugName.trim()) return;
        setAddingMed(true);
        try {
            await fetch("/api/medications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newMed),
            });
            setNewMed({ drugName: "", dosage: "", form: "tablet", frequency: "once daily", timeOfDay: ["morning"], duration: "", instructions: "" });
            setShowAddForm(false);
            await fetchMedications();
        } catch (err) {
            console.error("Failed to add medication", err);
        } finally {
            setAddingMed(false);
        }
    };

    const deleteMedication = async (id: number) => {
        try {
            await fetch(`/api/medications/${id}`, { method: "DELETE" });
            await fetchMedications();
        } catch (err) {
            console.error("Failed to delete medication", err);
        }
    };

    // Calculate today's progress
    const totalDoses = TIME_SLOTS.reduce((acc, slot) => acc + getMedsForSlot(slot.key).length, 0);
    const takenDoses = logs.filter((l) => l.status === "taken").length;
    const progressPct = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 0;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-olive-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-olive-900 font-display">My Medications</h1>
                    <p className="text-olive-600 mt-1">Track your daily medication schedule</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-olive-800 text-cream-50 rounded-xl font-medium hover:bg-olive-900 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Medication
                </button>
            </div>

            {/* Today's Progress Card */}
            {activeMeds.length > 0 && (
                <div className="bg-white border border-sage-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-olive-700" />
                            <h2 className="text-lg font-semibold text-olive-900">Today&apos;s Progress</h2>
                        </div>
                        <span className="text-2xl font-bold text-olive-800">{progressPct}%</span>
                    </div>
                    <div className="w-full bg-sage-200 rounded-full h-3">
                        <div
                            className="bg-olive-700 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    <p className="text-sm text-olive-600 mt-2">
                        {takenDoses} of {totalDoses} doses taken today
                    </p>
                </div>
            )}

            {/* Add Medication Form */}
            {showAddForm && (
                <div className="bg-white border border-sage-200 rounded-xl p-5 space-y-4">
                    <h3 className="text-lg font-semibold text-olive-900 flex items-center gap-2">
                        <Pill className="w-5 h-5" />
                        Add New Medication
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-olive-700 block mb-1">Drug Name *</label>
                            <input
                                type="text"
                                value={newMed.drugName}
                                onChange={(e) => setNewMed({ ...newMed, drugName: e.target.value })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                                placeholder="e.g. Paracetamol"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-olive-700 block mb-1">Dosage</label>
                            <input
                                type="text"
                                value={newMed.dosage}
                                onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                                placeholder="e.g. 500mg"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-olive-700 block mb-1">Form</label>
                            <select
                                value={newMed.form}
                                onChange={(e) => setNewMed({ ...newMed, form: e.target.value })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                            >
                                <option value="tablet">Tablet</option>
                                <option value="capsule">Capsule</option>
                                <option value="syrup">Syrup</option>
                                <option value="injection">Injection</option>
                                <option value="cream">Cream</option>
                                <option value="drops">Drops</option>
                                <option value="inhaler">Inhaler</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-olive-700 block mb-1">Frequency</label>
                            <select
                                value={newMed.frequency}
                                onChange={(e) => {
                                    const freq = e.target.value;
                                    let times = ["morning"];
                                    if (freq === "twice daily") times = ["morning", "evening"];
                                    if (freq === "thrice daily") times = ["morning", "afternoon", "evening"];
                                    if (freq === "four times daily") times = ["morning", "afternoon", "evening", "night"];
                                    setNewMed({ ...newMed, frequency: freq, timeOfDay: times });
                                }}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                            >
                                <option value="once daily">Once Daily</option>
                                <option value="twice daily">Twice Daily</option>
                                <option value="thrice daily">Thrice Daily</option>
                                <option value="four times daily">Four Times Daily</option>
                                <option value="as needed">As Needed</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-olive-700 block mb-1">Duration</label>
                            <input
                                type="text"
                                value={newMed.duration}
                                onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                                placeholder="e.g. 7 days"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-olive-700 block mb-1">Instructions</label>
                            <input
                                type="text"
                                value={newMed.instructions}
                                onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                                placeholder="e.g. After meals"
                            />
                        </div>
                    </div>
                    {/* Time of Day Selection */}
                    <div>
                        <label className="text-sm font-medium text-olive-700 block mb-2">Time of Day</label>
                        <div className="flex flex-wrap gap-2">
                            {TIME_SLOTS.map((slot) => {
                                const selected = newMed.timeOfDay.includes(slot.key);
                                const Icon = slot.icon;
                                return (
                                    <button
                                        key={slot.key}
                                        onClick={() => {
                                            const times = selected
                                                ? newMed.timeOfDay.filter((t) => t !== slot.key)
                                                : [...newMed.timeOfDay, slot.key];
                                            setNewMed({ ...newMed, timeOfDay: times.length > 0 ? times : [slot.key] });
                                        }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                            selected
                                                ? "bg-olive-800 text-cream-50"
                                                : "bg-sage-100 text-olive-600 hover:bg-sage-200"
                                        }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {slot.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={addMedication}
                            disabled={addingMed || !newMed.drugName.trim()}
                            className="px-6 py-2.5 bg-olive-800 text-cream-50 rounded-xl font-medium hover:bg-olive-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {addingMed ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {addingMed ? "Adding..." : "Add Medication"}
                        </button>
                        <button
                            onClick={() => setShowAddForm(false)}
                            className="px-4 py-2.5 border border-sage-300 text-olive-700 rounded-xl font-medium hover:bg-sage-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Daily Schedule */}
            {activeMeds.length > 0 ? (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-olive-900">Daily Schedule</h2>
                    {TIME_SLOTS.map((slot) => {
                        const slotMeds = getMedsForSlot(slot.key);
                        if (slotMeds.length === 0) return null;
                        const Icon = slot.icon;
                        const isExpanded = expandedSlot === slot.key || expandedSlot === null;
                        const allTaken = slotMeds.every((m) => getLogStatus(m.id, slot.key)?.status === "taken");

                        return (
                            <div key={slot.key} className="bg-white border border-sage-200 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setExpandedSlot(expandedSlot === slot.key ? null : slot.key)}
                                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-sage-50 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                            allTaken ? "bg-green-100" : "bg-sage-100"
                                        }`}>
                                            <Icon className={`w-5 h-5 ${allTaken ? "text-green-600" : "text-olive-600"}`} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-semibold text-olive-900">{slot.label}</p>
                                            <p className="text-sm text-olive-500">{slot.time} · {slotMeds.length} medication{slotMeds.length > 1 ? "s" : ""}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {allTaken && <CheckCircle className="w-5 h-5 text-green-500" />}
                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-olive-400" /> : <ChevronDown className="w-5 h-5 text-olive-400" />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="px-5 pb-4 space-y-3">
                                        {slotMeds.map((med) => {
                                            const log = getLogStatus(med.id, slot.key);
                                            const logKey = `${med.id}-${slot.key}`;
                                            const isLogging = loggingId === logKey;

                                            return (
                                                <div
                                                    key={med.id}
                                                    className={`flex items-center justify-between p-3 rounded-lg border ${
                                                        log?.status === "taken"
                                                            ? "bg-green-50 border-green-200"
                                                            : log?.status === "missed"
                                                            ? "bg-red-50 border-red-200"
                                                            : log?.status === "skipped"
                                                            ? "bg-amber-50 border-amber-200"
                                                            : "bg-sage-50 border-sage-200"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <Pill className={`w-5 h-5 ${
                                                            log?.status === "taken" ? "text-green-600" :
                                                            log?.status === "missed" ? "text-red-500" :
                                                            "text-olive-500"
                                                        }`} />
                                                        <div>
                                                            <p className="font-medium text-olive-900">{med.drugName}</p>
                                                            <p className="text-sm text-olive-500">
                                                                {med.dosage}{med.form ? ` · ${med.form}` : ""}
                                                                {med.instructions ? ` · ${med.instructions}` : ""}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {isLogging ? (
                                                            <Loader2 className="w-5 h-5 text-olive-500 animate-spin" />
                                                        ) : log?.status === "taken" ? (
                                                            <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" /> Taken
                                                            </span>
                                                        ) : log?.status === "missed" ? (
                                                            <span className="text-xs px-2.5 py-1 bg-red-100 text-red-700 rounded-full font-medium flex items-center gap-1">
                                                                <XCircle className="w-3 h-3" /> Missed
                                                            </span>
                                                        ) : (
                                                            <div className="flex gap-1">
                                                                <button
                                                                    onClick={() => logMedication(med.id, slot.key, "taken")}
                                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                                                                >
                                                                    Taken
                                                                </button>
                                                                <button
                                                                    onClick={() => logMedication(med.id, slot.key, "skipped")}
                                                                    className="px-3 py-1.5 bg-sage-200 text-olive-700 rounded-lg text-xs font-medium hover:bg-sage-300 transition-colors"
                                                                >
                                                                    Skip
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                !showAddForm && (
                    <div className="bg-sage-50 border border-sage-200 rounded-xl p-8 text-center">
                        <Pill className="w-12 h-12 text-olive-400 mx-auto mb-3" />
                        <p className="text-olive-700 font-medium">No medications yet</p>
                        <p className="text-olive-500 text-sm mt-1">
                            Upload a prescription to auto-extract medications, or add them manually
                        </p>
                    </div>
                )
            )}

            {/* All Medications List */}
            {medications.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-olive-900">All Medications</h2>
                    <div className="bg-white border border-sage-200 rounded-xl divide-y divide-sage-200">
                        {medications.map((med) => (
                            <div key={med.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${med.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                                    <div>
                                        <p className="font-medium text-olive-900">{med.drugName}</p>
                                        <p className="text-sm text-olive-500">
                                            {[med.dosage, med.form, med.frequency].filter(Boolean).join(" · ")}
                                        </p>
                                        {med.instructions && (
                                            <p className="text-xs text-olive-400 mt-0.5 italic">{med.instructions}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                        med.addedBy === "ocr" ? "bg-blue-100 text-blue-700" :
                                        med.addedBy === "doctor" ? "bg-purple-100 text-purple-700" :
                                        "bg-sage-100 text-olive-600"
                                    }`}>
                                        {med.addedBy === "ocr" ? "From OCR" : med.addedBy === "doctor" ? "By Doctor" : "Self-added"}
                                    </span>
                                    <button
                                        onClick={() => deleteMedication(med.id)}
                                        className="p-1.5 text-olive-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Mini Game */}
            <div className="mt-2">
                <PillTicTacToe />
            </div>
        </div>
    );
}
