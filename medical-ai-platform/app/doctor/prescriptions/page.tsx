"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Pill, Plus, Trash2, Loader2, Users, Search,
    FileText, Dumbbell, Clock, Edit2, Save, X,
    ChevronDown, ChevronUp, Gamepad2,
} from "lucide-react";
import PillTicTacToe from "@/components/games/PillTicTacToe";

interface Patient {
    id: number;
    name: string;
    email: string;
    clerkId: string;
}

interface Medication {
    id: number;
    drugName: string;
    dosage: string | null;
    form: string | null;
    frequency: string | null;
    timeOfDay: string | null;
    duration: string | null;
    instructions: string | null;
    isActive: boolean;
    addedBy: string;
    startDate: string | null;
}

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
}

export default function DoctorPrescriptionsPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [medications, setMedications] = useState<Medication[]>([]);
    const [exercises, setExercises] = useState<ExerciseRoutine[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState<"medications" | "exercises">("medications");

    // Add medication form state
    const [showAddMed, setShowAddMed] = useState(false);
    const [newMed, setNewMed] = useState({
        drugName: "", dosage: "", form: "tablet", frequency: "once daily",
        timeOfDay: ["morning"] as string[], duration: "", instructions: "",
    });
    const [addingMed, setAddingMed] = useState(false);

    // Add exercise form
    const [showAddExercise, setShowAddExercise] = useState(false);
    const [newExercise, setNewExercise] = useState({
        name: "", type: "physio", description: "", frequency: "daily",
        durationMinutes: 20, timeOfDay: "morning",
        daysOfWeek: ["mon", "tue", "wed", "thu", "fri"] as string[],
        sets: 0, reps: 0,
    });
    const [addingExercise, setAddingExercise] = useState(false);

    // Editing
    const [editingMedId, setEditingMedId] = useState<number | null>(null);
    const [editMed, setEditMed] = useState<Partial<Medication>>({});

    useEffect(() => {
        const fetchPatients = async () => {
            try {
                const res = await fetch("/api/users/patients");
                if (res.ok) {
                    const data = await res.json();
                    setPatients(data.patients || data);
                }
            } catch (err) {
                console.error("Failed to fetch patients", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPatients();
    }, []);

    const fetchPatientData = useCallback(async (patientId: number) => {
        setLoadingData(true);
        try {
            const [medsRes, exRes] = await Promise.all([
                fetch(`/api/medications?patientId=${patientId}`),
                fetch(`/api/exercises?patientId=${patientId}`),
            ]);
            if (medsRes.ok) {
                const data = await medsRes.json();
                setMedications(data.medications);
            }
            if (exRes.ok) {
                const data = await exRes.json();
                setExercises(data.routines);
            }
        } catch (err) {
            console.error("Failed to fetch patient data", err);
        } finally {
            setLoadingData(false);
        }
    }, []);

    const selectPatient = (patient: Patient) => {
        setSelectedPatient(patient);
        fetchPatientData(patient.id);
        setShowAddMed(false);
        setShowAddExercise(false);
        setEditingMedId(null);
    };

    const addMedication = async () => {
        if (!newMed.drugName.trim() || !selectedPatient) return;
        setAddingMed(true);
        try {
            await fetch("/api/medications", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newMed, patientId: selectedPatient.id }),
            });
            setNewMed({ drugName: "", dosage: "", form: "tablet", frequency: "once daily", timeOfDay: ["morning"], duration: "", instructions: "" });
            setShowAddMed(false);
            await fetchPatientData(selectedPatient.id);
        } catch (err) {
            console.error("Failed to add medication", err);
        } finally {
            setAddingMed(false);
        }
    };

    const updateMedication = async (id: number) => {
        try {
            await fetch(`/api/medications/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(editMed),
            });
            setEditingMedId(null);
            if (selectedPatient) await fetchPatientData(selectedPatient.id);
        } catch (err) {
            console.error("Failed to update medication", err);
        }
    };

    const deleteMedication = async (id: number) => {
        try {
            await fetch(`/api/medications/${id}`, { method: "DELETE" });
            if (selectedPatient) await fetchPatientData(selectedPatient.id);
        } catch (err) {
            console.error("Failed to delete medication", err);
        }
    };

    const addExercise = async () => {
        if (!newExercise.name.trim() || !selectedPatient) return;
        setAddingExercise(true);
        try {
            await fetch("/api/exercises", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newExercise, patientId: selectedPatient.id }),
            });
            setNewExercise({
                name: "", type: "physio", description: "", frequency: "daily",
                durationMinutes: 20, timeOfDay: "morning",
                daysOfWeek: ["mon", "tue", "wed", "thu", "fri"],
                sets: 0, reps: 0,
            });
            setShowAddExercise(false);
            if (selectedPatient) await fetchPatientData(selectedPatient.id);
        } catch (err) {
            console.error("Failed to add exercise", err);
        } finally {
            setAddingExercise(false);
        }
    };

    const deleteExercise = async (id: number) => {
        try {
            await fetch(`/api/exercises/${id}`, { method: "DELETE" });
            if (selectedPatient) await fetchPatientData(selectedPatient.id);
        } catch (err) {
            console.error("Failed to delete exercise", err);
        }
    };

    const filteredPatients = patients.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 text-olive-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-olive-900 font-display">Patient Prescriptions</h1>
                <p className="text-olive-600 mt-1">Manage medications and exercise routines for your patients</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Patient List */}
                <div className="lg:col-span-1">
                    <div className="bg-white border border-sage-200 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-sage-200">
                            <div className="relative">
                                <Search className="w-4 h-4 text-olive-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search patients..."
                                    className="w-full pl-9 pr-3 py-2 border border-sage-300 rounded-lg text-olive-900 text-sm focus:ring-2 focus:ring-olive-500 focus:border-olive-500"
                                />
                            </div>
                        </div>
                        <div className="max-h-96 overflow-y-auto divide-y divide-sage-100">
                            {filteredPatients.length > 0 ? (
                                filteredPatients.map((patient) => (
                                    <button
                                        key={patient.id}
                                        onClick={() => selectPatient(patient)}
                                        className={`w-full text-left px-4 py-3 hover:bg-sage-50 transition-colors ${
                                            selectedPatient?.id === patient.id ? "bg-sage-100 border-l-2 border-olive-700" : ""
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-olive-100 rounded-full flex items-center justify-center">
                                                <Users className="w-4 h-4 text-olive-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-olive-900">{patient.name}</p>
                                                <p className="text-xs text-olive-500">{patient.email}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="p-6 text-center text-olive-500 text-sm">No patients found</div>
                            )}
                        </div>
                    </div>

                    {/* Mini Game */}
                    <div className="mt-4">
                        <PillTicTacToe />
                    </div>
                </div>

                {/* Patient Details */}
                <div className="lg:col-span-2 space-y-4">
                    {selectedPatient ? (
                        <>
                            {/* Patient Header */}
                            <div className="bg-white border border-sage-200 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-olive-100 rounded-full flex items-center justify-center">
                                        <Users className="w-5 h-5 text-olive-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-olive-900">{selectedPatient.name}</p>
                                        <p className="text-sm text-olive-500">{selectedPatient.email}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 text-sm">
                                    <span className="px-2.5 py-1 bg-sage-100 text-olive-600 rounded-full">
                                        {medications.length} meds
                                    </span>
                                    <span className="px-2.5 py-1 bg-sage-100 text-olive-600 rounded-full">
                                        {exercises.length} routines
                                    </span>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-sage-200">
                                <button
                                    onClick={() => setActiveTab("medications")}
                                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                        activeTab === "medications"
                                            ? "border-olive-700 text-olive-900"
                                            : "border-transparent text-olive-500 hover:text-olive-700"
                                    }`}
                                >
                                    <Pill className="w-4 h-4" />
                                    Medications
                                </button>
                                <button
                                    onClick={() => setActiveTab("exercises")}
                                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                                        activeTab === "exercises"
                                            ? "border-olive-700 text-olive-900"
                                            : "border-transparent text-olive-500 hover:text-olive-700"
                                    }`}
                                >
                                    <Dumbbell className="w-4 h-4" />
                                    Exercise Routines
                                </button>
                            </div>

                            {loadingData ? (
                                <div className="flex items-center justify-center h-32">
                                    <Loader2 className="w-6 h-6 text-olive-600 animate-spin" />
                                </div>
                            ) : activeTab === "medications" ? (
                                <div className="space-y-4">
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setShowAddMed(!showAddMed)}
                                            className="flex items-center gap-2 px-4 py-2 bg-olive-800 text-cream-50 rounded-xl text-sm font-medium hover:bg-olive-900 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Add Medication
                                        </button>
                                    </div>

                                    {/* Add Med Form */}
                                    {showAddMed && (
                                        <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 space-y-3">
                                            <h4 className="font-medium text-olive-800 text-sm">prescribe new medication</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input type="text" value={newMed.drugName}
                                                    onChange={(e) => setNewMed({ ...newMed, drugName: e.target.value })}
                                                    placeholder="Drug name *" className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900" />
                                                <input type="text" value={newMed.dosage}
                                                    onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
                                                    placeholder="Dosage" className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900" />
                                                <select value={newMed.form}
                                                    onChange={(e) => setNewMed({ ...newMed, form: e.target.value })}
                                                    className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900">
                                                    <option value="tablet">Tablet</option>
                                                    <option value="capsule">Capsule</option>
                                                    <option value="syrup">Syrup</option>
                                                    <option value="injection">Injection</option>
                                                    <option value="cream">Cream</option>
                                                </select>
                                                <select value={newMed.frequency}
                                                    onChange={(e) => {
                                                        const f = e.target.value;
                                                        let t = ["morning"];
                                                        if (f === "twice daily") t = ["morning", "evening"];
                                                        if (f === "thrice daily") t = ["morning", "afternoon", "evening"];
                                                        setNewMed({ ...newMed, frequency: f, timeOfDay: t });
                                                    }}
                                                    className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900">
                                                    <option value="once daily">Once Daily</option>
                                                    <option value="twice daily">Twice Daily</option>
                                                    <option value="thrice daily">Thrice Daily</option>
                                                    <option value="as needed">As Needed</option>
                                                </select>
                                                <input type="text" value={newMed.duration}
                                                    onChange={(e) => setNewMed({ ...newMed, duration: e.target.value })}
                                                    placeholder="Duration (e.g. 7 days)" className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900" />
                                                <input type="text" value={newMed.instructions}
                                                    onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })}
                                                    placeholder="Instructions" className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900" />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={addMedication} disabled={addingMed || !newMed.drugName.trim()}
                                                    className="px-4 py-2 bg-olive-800 text-cream-50 rounded-lg text-sm font-medium hover:bg-olive-900 disabled:opacity-50 flex items-center gap-1">
                                                    {addingMed ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Prescribe
                                                </button>
                                                <button onClick={() => setShowAddMed(false)}
                                                    className="px-4 py-2 border border-sage-300 text-olive-700 rounded-lg text-sm hover:bg-sage-50">Cancel</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Medications List */}
                                    {medications.length > 0 ? (
                                        <div className="bg-white border border-sage-200 rounded-xl divide-y divide-sage-100">
                                            {medications.map((med) => (
                                                <div key={med.id} className="p-4">
                                                    {editingMedId === med.id ? (
                                                        <div className="space-y-3">
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <input type="text" value={editMed.drugName || ""} onChange={(e) => setEditMed({ ...editMed, drugName: e.target.value })}
                                                                    className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900" placeholder="Drug name" />
                                                                <input type="text" value={editMed.dosage || ""} onChange={(e) => setEditMed({ ...editMed, dosage: e.target.value })}
                                                                    className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900" placeholder="Dosage" />
                                                                <input type="text" value={editMed.frequency || ""} onChange={(e) => setEditMed({ ...editMed, frequency: e.target.value })}
                                                                    className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900" placeholder="Frequency" />
                                                                <input type="text" value={editMed.instructions || ""} onChange={(e) => setEditMed({ ...editMed, instructions: e.target.value })}
                                                                    className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900" placeholder="Instructions" />
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <button onClick={() => updateMedication(med.id)}
                                                                    className="px-3 py-1.5 bg-olive-800 text-cream-50 rounded-lg text-xs font-medium flex items-center gap-1">
                                                                    <Save className="w-3 h-3" /> Save
                                                                </button>
                                                                <button onClick={() => setEditingMedId(null)}
                                                                    className="px-3 py-1.5 border border-sage-300 text-olive-700 rounded-lg text-xs flex items-center gap-1">
                                                                    <X className="w-3 h-3" /> Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-2 h-2 rounded-full ${med.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                                                                <div>
                                                                    <p className="font-medium text-olive-900">{med.drugName}</p>
                                                                    <p className="text-sm text-olive-500">
                                                                        {[med.dosage, med.form, med.frequency].filter(Boolean).join(" · ")}
                                                                    </p>
                                                                    {med.instructions && <p className="text-xs text-olive-400 mt-0.5 italic">{med.instructions}</p>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                                    med.addedBy === "ocr" ? "bg-blue-100 text-blue-700" :
                                                                    med.addedBy === "doctor" ? "bg-purple-100 text-purple-700" :
                                                                    "bg-sage-100 text-olive-600"
                                                                }`}>
                                                                    {med.addedBy === "ocr" ? "OCR" : med.addedBy === "doctor" ? "Doctor" : "Patient"}
                                                                </span>
                                                                <button onClick={() => { setEditingMedId(med.id); setEditMed(med); }}
                                                                    className="p-1.5 text-olive-400 hover:text-olive-700 hover:bg-sage-50 rounded-lg">
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button onClick={() => deleteMedication(med.id)}
                                                                    className="p-1.5 text-olive-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-sage-50 border border-sage-200 rounded-xl p-6 text-center">
                                            <Pill className="w-8 h-8 text-olive-400 mx-auto mb-2" />
                                            <p className="text-olive-600 text-sm">No medications for this patient</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Exercise Routines Tab */
                                <div className="space-y-4">
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => setShowAddExercise(!showAddExercise)}
                                            className="flex items-center gap-2 px-4 py-2 bg-olive-800 text-cream-50 rounded-xl text-sm font-medium hover:bg-olive-900 transition-colors"
                                        >
                                            <Plus className="w-4 h-4" /> Prescribe Exercise
                                        </button>
                                    </div>

                                    {showAddExercise && (
                                        <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 space-y-3">
                                            <h4 className="font-medium text-olive-800 text-sm">Prescribe exercise routine</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input type="text" value={newExercise.name}
                                                    onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                                                    placeholder="Exercise name *" className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900" />
                                                <select value={newExercise.type}
                                                    onChange={(e) => setNewExercise({ ...newExercise, type: e.target.value })}
                                                    className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900">
                                                    <option value="cardio">Cardio</option>
                                                    <option value="strength">Strength</option>
                                                    <option value="flexibility">Flexibility</option>
                                                    <option value="physio">Physiotherapy</option>
                                                    <option value="yoga">Yoga</option>
                                                    <option value="walking">Walking</option>
                                                    <option value="other">Other</option>
                                                </select>
                                                <input type="number" value={newExercise.durationMinutes}
                                                    onChange={(e) => setNewExercise({ ...newExercise, durationMinutes: parseInt(e.target.value) || 0 })}
                                                    placeholder="Duration (min)" className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900" />
                                                <select value={newExercise.timeOfDay}
                                                    onChange={(e) => setNewExercise({ ...newExercise, timeOfDay: e.target.value })}
                                                    className="px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900">
                                                    <option value="morning">Morning</option>
                                                    <option value="afternoon">Afternoon</option>
                                                    <option value="evening">Evening</option>
                                                </select>
                                                <input type="text" value={newExercise.description}
                                                    onChange={(e) => setNewExercise({ ...newExercise, description: e.target.value })}
                                                    placeholder="Description / notes" className="col-span-2 px-3 py-2 border border-sage-300 rounded-lg text-sm text-olive-900" />
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={addExercise} disabled={addingExercise || !newExercise.name.trim()}
                                                    className="px-4 py-2 bg-olive-800 text-cream-50 rounded-lg text-sm font-medium hover:bg-olive-900 disabled:opacity-50 flex items-center gap-1">
                                                    {addingExercise ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Prescribe
                                                </button>
                                                <button onClick={() => setShowAddExercise(false)}
                                                    className="px-4 py-2 border border-sage-300 text-olive-700 rounded-lg text-sm hover:bg-sage-50">Cancel</button>
                                            </div>
                                        </div>
                                    )}

                                    {exercises.length > 0 ? (
                                        <div className="bg-white border border-sage-200 rounded-xl divide-y divide-sage-100">
                                            {exercises.map((ex) => (
                                                <div key={ex.id} className="p-4 flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <Dumbbell className="w-5 h-5 text-olive-500" />
                                                        <div>
                                                            <p className="font-medium text-olive-900">{ex.name}</p>
                                                            <p className="text-sm text-olive-500">
                                                                {ex.type} · {ex.durationMinutes ? `${ex.durationMinutes} min` : ""}
                                                                {ex.sets && ex.reps ? ` · ${ex.sets}×${ex.reps}` : ""}
                                                                {ex.frequency ? ` · ${ex.frequency}` : ""}
                                                            </p>
                                                            {ex.description && <p className="text-xs text-olive-400 mt-0.5">{ex.description}</p>}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                                            ex.addedBy === "doctor" ? "bg-purple-100 text-purple-700" : "bg-sage-100 text-olive-600"
                                                        }`}>
                                                            {ex.addedBy === "doctor" ? "Doctor" : "Patient"}
                                                        </span>
                                                        <button onClick={() => deleteExercise(ex.id)}
                                                            className="p-1.5 text-olive-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-sage-50 border border-sage-200 rounded-xl p-6 text-center">
                                            <Dumbbell className="w-8 h-8 text-olive-400 mx-auto mb-2" />
                                            <p className="text-olive-600 text-sm">No exercise routines for this patient</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="bg-sage-50 border border-sage-200 rounded-xl p-12 text-center">
                            <Users className="w-12 h-12 text-olive-400 mx-auto mb-3" />
                            <p className="text-olive-700 font-medium">Select a patient</p>
                            <p className="text-olive-500 text-sm mt-1">Choose a patient from the list to manage their medications and exercises</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
