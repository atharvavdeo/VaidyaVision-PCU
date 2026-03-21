"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Dumbbell, Plus, Trash2, Loader2, CheckCircle,
    Clock, Calendar, Flame, Heart, Wind, StretchHorizontal,
    Footprints, ChevronDown, ChevronUp, Target,
} from "lucide-react";

interface ExerciseRoutine {
    id: number;
    name: string;
    type: string;
    description: string | null;
    frequency: string | null;
    durationMinutes: number | null;
    timeOfDay: string | null;
    daysOfWeek: string | null;
    sets: number | null;
    reps: number | null;
    isActive: boolean;
    addedBy: string;
    createdAt: string;
}

interface ExerciseLog {
    id: number;
    routineId: number;
    status: string;
    durationMinutes: number | null;
    logDate: string;
}

const EXERCISE_TYPES = [
    { key: "cardio", label: "Cardio", icon: Heart, color: "bg-red-100 text-red-600" },
    { key: "strength", label: "Strength", icon: Dumbbell, color: "bg-blue-100 text-blue-600" },
    { key: "flexibility", label: "Flexibility", icon: StretchHorizontal, color: "bg-purple-100 text-purple-600" },
    { key: "physio", label: "Physiotherapy", icon: Target, color: "bg-emerald-100 text-emerald-600" },
    { key: "yoga", label: "Yoga", icon: Wind, color: "bg-amber-100 text-amber-600" },
    { key: "walking", label: "Walking", icon: Footprints, color: "bg-teal-100 text-teal-600" },
    { key: "other", label: "Other", icon: Flame, color: "bg-orange-100 text-orange-600" },
];

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<string, string> = {
    mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

export default function ExercisePage() {
    const [routines, setRoutines] = useState<ExerciseRoutine[]>([]);
    const [logs, setLogs] = useState<ExerciseLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [loggingId, setLoggingId] = useState<number | null>(null);

    const [newRoutine, setNewRoutine] = useState({
        name: "", type: "cardio", description: "", frequency: "daily",
        durationMinutes: 30, timeOfDay: "morning",
        daysOfWeek: ["mon", "tue", "wed", "thu", "fri"] as string[],
        sets: 0, reps: 0,
    });
    const [adding, setAdding] = useState(false);

    const fetchExercises = useCallback(async () => {
        try {
            const res = await fetch("/api/exercises");
            if (res.ok) {
                const data = await res.json();
                setRoutines(data.routines);
                setLogs(data.todayLogs);
            }
        } catch (err) {
            console.error("Failed to fetch exercises", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchExercises(); }, [fetchExercises]);

    const activeRoutines = routines.filter((r) => r.isActive);

    const getLogForRoutine = (routineId: number) => {
        return logs.find((l) => l.routineId === routineId);
    };

    const isTodayScheduled = (routine: ExerciseRoutine) => {
        try {
            if (!routine.daysOfWeek) return true;
            const days = JSON.parse(routine.daysOfWeek);
            const today = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
            return days.includes(today);
        } catch {
            return true;
        }
    };

    const logExercise = async (routineId: number, status: "completed" | "partial" | "skipped", durationMinutes?: number) => {
        setLoggingId(routineId);
        try {
            await fetch("/api/exercises/log", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ routineId, status, durationMinutes }),
            });
            await fetchExercises();
        } catch (err) {
            console.error("Failed to log exercise", err);
        } finally {
            setLoggingId(null);
        }
    };

    const addRoutine = async () => {
        if (!newRoutine.name.trim()) return;
        setAdding(true);
        try {
            await fetch("/api/exercises", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRoutine),
            });
            setNewRoutine({
                name: "", type: "cardio", description: "", frequency: "daily",
                durationMinutes: 30, timeOfDay: "morning",
                daysOfWeek: ["mon", "tue", "wed", "thu", "fri"],
                sets: 0, reps: 0,
            });
            setShowAddForm(false);
            await fetchExercises();
        } catch (err) {
            console.error("Failed to add routine", err);
        } finally {
            setAdding(false);
        }
    };

    const deleteRoutine = async (id: number) => {
        try {
            await fetch(`/api/exercises/${id}`, { method: "DELETE" });
            await fetchExercises();
        } catch (err) {
            console.error("Failed to delete routine", err);
        }
    };

    // Stats
    const todayScheduled = activeRoutines.filter(isTodayScheduled);
    const todayCompleted = todayScheduled.filter((r) => getLogForRoutine(r.id)?.status === "completed").length;
    const totalMinutes = logs
        .filter((l) => l.status === "completed" || l.status === "partial")
        .reduce((sum, l) => sum + (l.durationMinutes || 0), 0);

    const getTypeInfo = (type: string) => {
        return EXERCISE_TYPES.find((t) => t.key === type) || EXERCISE_TYPES[EXERCISE_TYPES.length - 1];
    };

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
                    <h1 className="text-2xl font-bold text-olive-900 font-display">Exercise Tracker</h1>
                    <p className="text-olive-600 mt-1">Track your daily workouts and fitness routines</p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-olive-800 text-cream-50 rounded-xl font-medium hover:bg-olive-900 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Add Routine
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-sage-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-olive-900">{todayCompleted}/{todayScheduled.length}</p>
                            <p className="text-sm text-olive-500">Completed Today</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white border border-sage-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-olive-900">{totalMinutes} min</p>
                            <p className="text-sm text-olive-500">Active Today</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white border border-sage-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                            <Flame className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-olive-900">{activeRoutines.length}</p>
                            <p className="text-sm text-olive-500">Active Routines</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Routine Form */}
            {showAddForm && (
                <div className="bg-white border border-sage-200 rounded-xl p-5 space-y-4">
                    <h3 className="text-lg font-semibold text-olive-900 flex items-center gap-2">
                        <Dumbbell className="w-5 h-5" />
                        Add New Routine
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-olive-700 block mb-1">Exercise Name *</label>
                            <input
                                type="text"
                                value={newRoutine.name}
                                onChange={(e) => setNewRoutine({ ...newRoutine, name: e.target.value })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                                placeholder="e.g. Morning Walk"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-olive-700 block mb-1">Type</label>
                            <select
                                value={newRoutine.type}
                                onChange={(e) => setNewRoutine({ ...newRoutine, type: e.target.value })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                            >
                                {EXERCISE_TYPES.map((t) => (
                                    <option key={t.key} value={t.key}>{t.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-olive-700 block mb-1">Duration (minutes)</label>
                            <input
                                type="number"
                                value={newRoutine.durationMinutes}
                                onChange={(e) => setNewRoutine({ ...newRoutine, durationMinutes: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-olive-700 block mb-1">Time of Day</label>
                            <select
                                value={newRoutine.timeOfDay}
                                onChange={(e) => setNewRoutine({ ...newRoutine, timeOfDay: e.target.value })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                            >
                                <option value="morning">Morning</option>
                                <option value="afternoon">Afternoon</option>
                                <option value="evening">Evening</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-olive-700 block mb-1">Sets</label>
                            <input
                                type="number"
                                value={newRoutine.sets}
                                onChange={(e) => setNewRoutine({ ...newRoutine, sets: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                                placeholder="0 if not applicable"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-olive-700 block mb-1">Reps</label>
                            <input
                                type="number"
                                value={newRoutine.reps}
                                onChange={(e) => setNewRoutine({ ...newRoutine, reps: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                                placeholder="0 if not applicable"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-olive-700 block mb-1">Description</label>
                        <input
                            type="text"
                            value={newRoutine.description}
                            onChange={(e) => setNewRoutine({ ...newRoutine, description: e.target.value })}
                            className="w-full px-3 py-2 border border-sage-300 rounded-lg text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                            placeholder="Optional notes about this exercise"
                        />
                    </div>
                    {/* Days of Week */}
                    <div>
                        <label className="text-sm font-medium text-olive-700 block mb-2">Schedule Days</label>
                        <div className="flex gap-2">
                            {DAYS.map((day) => {
                                const selected = newRoutine.daysOfWeek.includes(day);
                                return (
                                    <button
                                        key={day}
                                        onClick={() => {
                                            const days = selected
                                                ? newRoutine.daysOfWeek.filter((d) => d !== day)
                                                : [...newRoutine.daysOfWeek, day];
                                            setNewRoutine({ ...newRoutine, daysOfWeek: days.length > 0 ? days : [day] });
                                        }}
                                        className={`w-11 h-11 rounded-lg text-sm font-medium transition-all ${
                                            selected
                                                ? "bg-olive-800 text-cream-50"
                                                : "bg-sage-100 text-olive-600 hover:bg-sage-200"
                                        }`}
                                    >
                                        {DAY_LABELS[day]}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={addRoutine}
                            disabled={adding || !newRoutine.name.trim()}
                            className="px-6 py-2.5 bg-olive-800 text-cream-50 rounded-xl font-medium hover:bg-olive-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            {adding ? "Adding..." : "Add Routine"}
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

            {/* Today's Routines */}
            {todayScheduled.length > 0 ? (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-olive-900 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Today&apos;s Routines
                    </h2>
                    {todayScheduled.map((routine) => {
                        const log = getLogForRoutine(routine.id);
                        const typeInfo = getTypeInfo(routine.type);
                        const TypeIcon = typeInfo.icon;
                        const isExpanded = expandedId === routine.id;
                        const isLogging = loggingId === routine.id;

                        return (
                            <div key={routine.id} className="bg-white border border-sage-200 rounded-xl overflow-hidden">
                                <div className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.color}`}>
                                            <TypeIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-olive-900">{routine.name}</p>
                                            <p className="text-sm text-olive-500">
                                                {routine.durationMinutes ? `${routine.durationMinutes} min` : ""}
                                                {routine.sets && routine.reps ? ` · ${routine.sets}×${routine.reps}` : ""}
                                                {routine.timeOfDay ? ` · ${routine.timeOfDay}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isLogging ? (
                                            <Loader2 className="w-5 h-5 text-olive-500 animate-spin" />
                                        ) : log ? (
                                            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                                                log.status === "completed" ? "bg-green-100 text-green-700" :
                                                log.status === "partial" ? "bg-amber-100 text-amber-700" :
                                                "bg-red-100 text-red-700"
                                            }`}>
                                                {log.status === "completed" ? "Done" : log.status === "partial" ? "Partial" : "Skipped"}
                                            </span>
                                        ) : (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => logExercise(routine.id, "completed", routine.durationMinutes || undefined)}
                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
                                                >
                                                    Done
                                                </button>
                                                <button
                                                    onClick={() => logExercise(routine.id, "partial")}
                                                    className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600 transition-colors"
                                                >
                                                    Partial
                                                </button>
                                                <button
                                                    onClick={() => logExercise(routine.id, "skipped")}
                                                    className="px-3 py-1.5 bg-sage-200 text-olive-700 rounded-lg text-xs font-medium hover:bg-sage-300 transition-colors"
                                                >
                                                    Skip
                                                </button>
                                            </div>
                                        )}
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : routine.id)}
                                            className="p-1 text-olive-400 hover:text-olive-600"
                                        >
                                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-sage-100 pt-3 flex items-center justify-between">
                                        <div className="text-sm text-olive-600 space-y-1">
                                            {routine.description && <p>{routine.description}</p>}
                                            <p>Frequency: {routine.frequency || "Daily"}</p>
                                            {routine.daysOfWeek && (
                                                <p>Days: {JSON.parse(routine.daysOfWeek).map((d: string) => DAY_LABELS[d] || d).join(", ")}</p>
                                            )}
                                            <p className="text-xs text-olive-400">
                                                Added by: {routine.addedBy === "doctor" ? "Doctor" : "You"}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => deleteRoutine(routine.id)}
                                            className="p-2 text-olive-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                !showAddForm && (
                    <div className="bg-sage-50 border border-sage-200 rounded-xl p-8 text-center">
                        <Dumbbell className="w-12 h-12 text-olive-400 mx-auto mb-3" />
                        <p className="text-olive-700 font-medium">No routines scheduled today</p>
                        <p className="text-olive-500 text-sm mt-1">
                            Add exercise routines to start tracking your fitness
                        </p>
                    </div>
                )
            )}
        </div>
    );
}
