"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, User, Scan, MessageSquare, Calendar, FileText, Plus, X, Loader2, Phone, Mail, Upload } from "lucide-react";
import VoiceInputButton from "@/components/voice/VoiceInputButton";

interface Patient {
    id: number;
    name: string;
    email: string;
    imageUrl: string | null;
    age?: number;
    gender?: string;
    bloodType?: string;
    phone?: string;
    medicalHistory?: string;
    createdAt: string;
}

export default function DoctorPatientsPage() {
    const router = useRouter();
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [newPatient, setNewPatient] = useState({
        name: "", email: "", age: "", gender: "Male", bloodType: "O+", phone: "", medicalHistory: ""
    });
    const [searchQuery, setSearchQuery] = useState("");

    const fetchPatients = () => {
        fetch("/api/users/patients")
            .then((r) => r.json())
            .then((data) => {
                setPatients(data.patients || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => { fetchPatients(); }, []);

    const addPatient = async () => {
        if (!newPatient.name || !newPatient.email) return;
        setAddLoading(true);
        try {
            const res = await fetch("/api/users/patients", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newPatient.name,
                    email: newPatient.email,
                    age: newPatient.age ? parseInt(newPatient.age) : undefined,
                    gender: newPatient.gender,
                    bloodType: newPatient.bloodType,
                    phone: newPatient.phone || undefined,
                    medicalHistory: newPatient.medicalHistory || undefined,
                })
            });
            if (res.ok) {
                setShowAddModal(false);
                setNewPatient({ name: "", email: "", age: "", gender: "Male", bloodType: "O+", phone: "", medicalHistory: "" });
                fetchPatients();
            }
        } catch (err) {
            console.error(err);
        }
        setAddLoading(false);
    };

    const filtered = patients.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <h1 className="text-2xl font-display font-bold text-olive-900">Patients</h1>
                    <p className="text-olive-500 text-sm mt-1">{patients.length} registered patients</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-olive-800 text-cream-50 rounded-xl font-display font-bold text-sm uppercase tracking-wider hover:bg-olive-900 transition shadow-lg shadow-olive-800/20"
                >
                    <Plus className="w-4 h-4" /> Add Patient
                </button>
            </div>

            {/* Search */}
            <input
                type="text"
                placeholder="Search patients by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 border border-sage-300 rounded-xl text-sm bg-cream-50 text-olive-900 focus:ring-2 focus:ring-olive-500 outline-none"
            />

            {/* Add Patient Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-olive-900/40 backdrop-blur-sm">
                    <div className="bg-cream-50 rounded-2xl p-6 w-full max-w-lg shadow-2xl mx-4 border border-sage-300">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-xl font-display font-bold text-olive-900">Add New Patient</h2>
                            <button onClick={() => setShowAddModal(false)} className="p-1.5 hover:bg-sage-100 rounded-full">
                                <X className="w-5 h-5 text-olive-600" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-display font-bold text-olive-500 uppercase tracking-wider">Full Name *</label>
                                    <div className="relative">
                                        <input
                                            value={newPatient.name}
                                            onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                                            className="w-full mt-1 px-3 py-2.5 pr-9 border border-sage-300 rounded-xl text-sm bg-cream-100 text-olive-900 focus:ring-2 focus:ring-olive-500 outline-none"
                                            placeholder="Kawaljeet Singh"
                                        />
                                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 mt-0.5">
                                            <VoiceInputButton
                                                onTranscript={() => {}}
                                                mode="replace"
                                                currentValue={newPatient.name}
                                                onValueChange={(v: string) => setNewPatient({ ...newPatient, name: v })}
                                                compact
                                                title="Dictate name"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-display font-bold text-olive-500 uppercase tracking-wider">Email *</label>
                                    <input
                                        value={newPatient.email}
                                        onChange={(e) => setNewPatient({ ...newPatient, email: e.target.value })}
                                        className="w-full mt-1 px-3 py-2.5 border border-sage-300 rounded-xl text-sm bg-cream-100 text-olive-900 focus:ring-2 focus:ring-olive-500 outline-none"
                                        placeholder="patient@email.com"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-display font-bold text-olive-500 uppercase tracking-wider">Age</label>
                                    <input
                                        type="number"
                                        value={newPatient.age}
                                        onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                                        className="w-full mt-1 px-3 py-2.5 border border-sage-300 rounded-xl text-sm bg-cream-100 text-olive-900 focus:ring-2 focus:ring-olive-500 outline-none"
                                        placeholder="45"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-display font-bold text-olive-500 uppercase tracking-wider">Gender</label>
                                    <select
                                        value={newPatient.gender}
                                        onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                                        className="w-full mt-1 px-3 py-2.5 border border-sage-300 rounded-xl text-sm bg-cream-100 text-olive-900 focus:ring-2 focus:ring-olive-500 outline-none"
                                    >
                                        <option>Male</option>
                                        <option>Female</option>
                                        <option>Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-display font-bold text-olive-500 uppercase tracking-wider">Blood Type</label>
                                    <select
                                        value={newPatient.bloodType}
                                        onChange={(e) => setNewPatient({ ...newPatient, bloodType: e.target.value })}
                                        className="w-full mt-1 px-3 py-2.5 border border-sage-300 rounded-xl text-sm bg-cream-100 text-olive-900 focus:ring-2 focus:ring-olive-500 outline-none"
                                    >
                                        {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(bt => <option key={bt}>{bt}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-display font-bold text-olive-500 uppercase tracking-wider">Phone</label>
                                <input
                                    value={newPatient.phone}
                                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                                    className="w-full mt-1 px-3 py-2.5 border border-sage-300 rounded-xl text-sm bg-cream-100 text-olive-900 focus:ring-2 focus:ring-olive-500 outline-none"
                                    placeholder="+91-7021470357"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-display font-bold text-olive-500 uppercase tracking-wider">Medical History</label>
                                <div className="relative">
                                    <textarea
                                        value={newPatient.medicalHistory}
                                        onChange={(e) => setNewPatient({ ...newPatient, medicalHistory: e.target.value })}
                                        rows={2}
                                        className="w-full mt-1 px-3 py-2.5 pr-9 border border-sage-300 rounded-xl text-sm bg-cream-100 text-olive-900 focus:ring-2 focus:ring-olive-500 outline-none resize-none"
                                        placeholder="Diabetes, Hypertension..."
                                    />
                                    <div className="absolute bottom-2 right-2">
                                        <VoiceInputButton
                                            onTranscript={() => {}}
                                            mode="append-block"
                                            currentValue={newPatient.medicalHistory}
                                            onValueChange={(v: string) => setNewPatient({ ...newPatient, medicalHistory: v })}
                                            compact
                                            title="Dictate history"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-5">
                            <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-sage-300 rounded-xl text-sm font-display font-bold text-olive-700 hover:bg-sage-100 transition">
                                Cancel
                            </button>
                            <button
                                onClick={addPatient}
                                disabled={addLoading || !newPatient.name || !newPatient.email}
                                className="flex-1 py-2.5 bg-olive-800 text-cream-50 rounded-xl text-sm font-display font-bold uppercase tracking-wider hover:bg-olive-900 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                Add Patient
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-olive-400">
                    <Users className="w-16 h-16 mb-4 opacity-40" />
                    <p className="text-lg font-display font-bold">No patients found</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((p) => (
                        <div
                            key={p.id}
                            className="bg-cream-100 rounded-[20px] border border-sage-300 border-dashed p-5 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 rounded-full bg-sage-200 flex items-center justify-center overflow-hidden">
                                    {p.imageUrl ? (
                                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-5 h-5 text-olive-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-display font-bold text-olive-900 truncate">{p.name}</p>
                                    <p className="text-xs text-olive-400 truncate">{p.email}</p>
                                    {(p.age || p.gender || p.bloodType) && (
                                        <p className="text-xs text-olive-600 font-medium mt-0.5">
                                            {p.age && `${p.age}y`} {p.gender && `· ${p.gender}`} {p.bloodType && `· ${p.bloodType}`}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => router.push(`/doctor/patients/${p.id}`)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-sage-200 text-olive-700 rounded-lg text-xs font-display font-bold hover:bg-sage-300 transition-colors"
                                >
                                    <FileText className="w-3.5 h-3.5" /> History
                                </button>
                                <button
                                    onClick={() => router.push(`/doctor/messages`)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cream-200 text-olive-600 rounded-lg text-xs font-display font-bold hover:bg-sage-100 transition-colors"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" /> Message
                                </button>
                                <button
                                    onClick={() => router.push(`/doctor/appointments`)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-cream-200 text-olive-600 rounded-lg text-xs font-display font-bold hover:bg-sage-100 transition-colors"
                                >
                                    <Calendar className="w-3.5 h-3.5" /> Schedule
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
