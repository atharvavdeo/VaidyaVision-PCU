"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import {
    User,
    Award,
    FileText,
    Star,
    Activity,
    Save,
    Loader2
} from "lucide-react";

export default function DoctorProfilePage() {
    const { user } = useUser();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState({
        specialty: "",
        degree: "",
        licenseNumber: "",
        experience: 0,
        rating: 0,
        totalConsultations: 0,
        totalScansReviewed: 0
    });

    useEffect(() => {
        fetch("/api/doctor/profile")
            .then(res => res.json())
            .then(data => {
                if (data.profile) {
                    setProfile(data.profile);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/doctor/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    specialty: profile.specialty,
                    degree: profile.degree,
                    licenseNumber: profile.licenseNumber,
                    experience: Number(profile.experience)
                })
            });

            if (res.ok) {
                // toast.success("Profile updated");
                alert("Profile updated successfully!");
            } else {
                alert("Failed to update profile");
            }
        } catch (error) {
            console.error(error);
            alert("Error saving profile");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-cream-50">
                <Loader2 className="w-8 h-8 animate-spin text-olive-900" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cream-50 p-6 md:p-8 font-sans text-olive-900">
            <header className="mb-8">
                <h1 className="font-display text-3xl font-bold text-olive-900">Doctor Profile</h1>
                <p className="text-olive-600">Manage your professional details and credentials.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Avatar & Stats */}
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-cream-100 p-6 rounded-[20px] border border-sage-300 border-dashed shadow-sm flex flex-col items-center text-center">
                        <img
                            src={user?.imageUrl}
                            alt={user?.fullName || "Doctor"}
                            className="w-32 h-32 rounded-full mb-4 border-4 border-sage-100"
                        />
                        <h2 className="font-display text-xl font-bold text-olive-900">{user?.fullName}</h2>
                        <p className="text-olive-600 text-sm mb-4">{user?.primaryEmailAddress?.emailAddress}</p>

                        <div className="flex items-center gap-1 bg-sage-100 px-3 py-1 rounded-full text-olive-800 text-sm font-medium">
                            <Star className="w-4 h-4 fill-olive-800" />
                            <span>{profile.rating?.toFixed(1) || "5.0"} Rating</span>
                        </div>
                    </div>

                    <div className="bg-olive-900 text-cream-50 p-6 rounded-2xl shadow-sm">
                        <h3 className="font-display text-sm uppercase tracking-widest text-olive-300 mb-4 border-b border-olive-700 pb-2">
                            Performance
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-olive-200 text-sm">Consultations</span>
                                <span className="font-display text-xl font-bold">{profile.totalConsultations}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-olive-200 text-sm">Scans Reviewed</span>
                                <span className="font-display text-xl font-bold">{profile.totalScansReviewed}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-olive-200 text-sm">Experience</span>
                                <span className="font-display text-xl font-bold">{profile.experience} Years</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Edit Form */}
                <div className="md:col-span-2">
                    <div className="bg-cream-100 p-8 rounded-[20px] border border-sage-300 border-dashed shadow-sm">
                        <h3 className="font-display text-lg font-bold text-olive-900 mb-6 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-olive-600" />
                            Professional Details
                        </h3>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-olive-700 uppercase tracking-wide mb-2">
                                        Specialty
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.specialty}
                                        onChange={(e) => setProfile({ ...profile, specialty: e.target.value })}
                                        className="w-full bg-cream-50 border border-sage-300 rounded-lg px-4 py-3 text-olive-900 focus:outline-none focus:border-olive-800 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-olive-700 uppercase tracking-wide mb-2">
                                        Degree / Qualification
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.degree}
                                        onChange={(e) => setProfile({ ...profile, degree: e.target.value })}
                                        className="w-full bg-cream-50 border border-sage-300 rounded-lg px-4 py-3 text-olive-900 focus:outline-none focus:border-olive-800 transition"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-olive-700 uppercase tracking-wide mb-2">
                                        License Number
                                    </label>
                                    <input
                                        type="text"
                                        value={profile.licenseNumber || ""}
                                        onChange={(e) => setProfile({ ...profile, licenseNumber: e.target.value })}
                                        className="w-full bg-cream-50 border border-sage-300 rounded-lg px-4 py-3 text-olive-900 focus:outline-none focus:border-olive-800 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-olive-700 uppercase tracking-wide mb-2">
                                        Years of Experience
                                    </label>
                                    <input
                                        type="number"
                                        value={profile.experience}
                                        onChange={(e) => setProfile({ ...profile, experience: Number(e.target.value) })}
                                        className="w-full bg-cream-50 border border-sage-300 rounded-lg px-4 py-3 text-olive-900 focus:outline-none focus:border-olive-800 transition"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-sage-100 flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-olive-800 text-cream-50 px-6 py-3 rounded-lg font-display text-sm font-bold tracking-wider uppercase hover:bg-olive-900 transition flex items-center gap-2 disabled:opacity-70"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
