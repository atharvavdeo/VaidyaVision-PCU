"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Upload,
    Brain,
    HeartPulse,
    Scan,
    Stethoscope,
    X,
    FileImage,
    AlertCircle,
    ArrowLeft,
    User,
    Mic,
} from "lucide-react";

const MODALITIES = [
    { id: "brain", label: "Brain MRI", icon: Brain, color: "bg-sage-100 text-olive-700 border-sage-300", activeColor: "bg-olive-800 text-cream-50 border-olive-800" },
    { id: "lung", label: "Lung X-ray", icon: Stethoscope, color: "bg-sage-100 text-olive-700 border-sage-300", activeColor: "bg-olive-800 text-cream-50 border-olive-800" },
    { id: "skin", label: "Skin Photo", icon: Scan, color: "bg-sage-100 text-olive-700 border-sage-300", activeColor: "bg-olive-800 text-cream-50 border-olive-800" },
    { id: "ecg", label: "ECG Image", icon: HeartPulse, color: "bg-sage-100 text-olive-700 border-sage-300", activeColor: "bg-olive-800 text-cream-50 border-olive-800" },
    { id: "audio", label: "Cough Audio", icon: Mic, color: "bg-sage-100 text-olive-700 border-sage-300", activeColor: "bg-olive-800 text-cream-50 border-olive-800" },
] as const;

function NewScanContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const patientId = searchParams.get("patientId");

    const [patient, setPatient] = useState<any>(null);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [modality, setModality] = useState<string | null>(null);
    const [symptoms, setSymptoms] = useState("");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    useEffect(() => {
        if (patientId) {
            fetch(`/api/doctor/patients/${patientId}`)
                .then((r) => r.ok ? r.json() : null)
                .then((data) => { if (data?.patient) setPatient(data.patient); })
                .catch(() => {});
        }
    }, [patientId]);

    const handleFile = useCallback((f: File) => {
        if (!f.type.startsWith("image/") && !f.type.startsWith("audio/") && !f.type.includes("video/")) {
            setError("Please upload an image or audio file (JPEG, PNG, MP3, WAV)");
            return;
        }
        setFile(f);
        setError(null);
        if (f.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(f);
        } else {
            setPreview("AUDIO_FILE");
        }
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
        },
        [handleFile]
    );

    const handleSubmit = async () => {
        if (!file || !modality) return;

        setUploading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("modality", modality);
            if (symptoms.trim()) formData.append("symptoms", symptoms);
            if (patientId) formData.append("patientId", patientId);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Upload failed");
            }

            const data = await res.json();
            router.push(`/doctor/scan/${data.scanId}`);
        } catch (err: any) {
            setError(err.message || "Upload failed. Please try again.");
            setUploading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 space-y-6">
            <div>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-olive-600 hover:text-olive-900 transition-colors mb-4 font-display font-medium text-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <h1 className="text-2xl font-display font-bold text-olive-900">
                    New Scan {patient ? `for ${patient.name}` : ""}
                </h1>
                <p className="text-olive-500 mt-1">
                    Upload a medical image for AI-powered analysis. The system will auto-detect pathology and provide preliminary results.
                </p>
            </div>

            {/* Patient badge */}
            {patient && (
                <div className="flex items-center gap-3 bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
                    <div className="w-9 h-9 bg-olive-100 rounded-full flex items-center justify-center text-olive-700 font-bold">
                        {patient.name?.[0]}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-olive-900">{patient.name}</p>
                        <p className="text-xs text-olive-500">Patient ID: #{patient.id}</p>
                    </div>
                </div>
            )}

            {/* Error Alert */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Step 1: Modality Selection */}
            <div className="bg-white rounded-2xl border border-sage-200 p-6">
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-olive-800 mb-4">
                    1. Select Scan Type
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {MODALITIES.map((m) => {
                        const Icon = m.icon;
                        const isActive = modality === m.id;
                        return (
                            <button
                                key={m.id}
                                onClick={() => setModality(m.id)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                                    isActive ? m.activeColor : m.color
                                }`}
                            >
                                <Icon className="w-6 h-6" />
                                <span className="text-sm font-display font-bold">{m.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Step 2: Image Upload */}
            <div className="bg-white rounded-2xl border border-sage-200 p-6">
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-olive-800 mb-4">
                    2. Upload Image
                </h2>

                {preview ? (
                    <div className="relative">
                        {preview === "AUDIO_FILE" ? (
                            <div className="w-full h-80 bg-sage-50 rounded-lg flex flex-col items-center justify-center border-2 border-sage-200">
                                <Mic className="w-16 h-16 text-olive-300 mb-4 animate-pulse" />
                                <span className="font-display font-medium text-olive-500">Audio ready for analysis</span>
                            </div>
                        ) : (
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full max-h-80 object-contain rounded-lg bg-cream-200"
                            />
                        )}
                        <button
                            onClick={() => { setFile(null); setPreview(null); }}
                            className="absolute top-2 right-2 p-1.5 bg-olive-900/70 rounded-full text-cream-50 hover:bg-olive-900"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <div className="mt-3 flex items-center gap-2 text-sm text-olive-500">
                            <FileImage className="w-4 h-4" />
                            <span>{file?.name}</span>
                            <span className="text-sage-300">•</span>
                            <span>{((file?.size || 0) / 1024 / 1024).toFixed(1)} MB</span>
                        </div>
                    </div>
                ) : (
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                            dragOver ? "border-olive-500 bg-sage-100" : "border-sage-300 hover:border-olive-500"
                        }`}
                        onClick={() => document.getElementById("file-input")?.click()}
                    >
                        <Upload className="w-10 h-10 mx-auto mb-3 text-olive-400" />
                        <p className="text-sm font-display font-bold text-olive-700">
                            Drag & drop the scan/audio here, or click to browse
                        </p>
                        <p className="text-xs text-olive-400 mt-1">
                            Supports JPEG, PNG, MP3, WAV • Max 10MB
                        </p>
                        <input
                            id="file-input"
                            type="file"
                            accept="image/*,audio/*"
                            className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                        />
                    </div>
                )}
            </div>

            {/* Step 3: Symptoms (Optional) */}
            <div className="bg-white rounded-2xl border border-sage-200 p-6">
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-olive-800 mb-1">
                    3. Symptoms <span className="text-olive-400 font-normal normal-case tracking-normal">(optional)</span>
                </h2>
                <p className="text-xs text-olive-400 mb-3">
                    Add patient symptoms to assist in clinical context
                </p>
                <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    rows={3}
                    placeholder="e.g. Persistent headache for 2 weeks, mild dizziness..."
                    className="w-full px-4 py-3 rounded-xl border border-sage-300 text-sm bg-cream-50 text-olive-900 focus:outline-none focus:ring-2 focus:ring-olive-500 focus:border-transparent resize-none"
                />
            </div>

            {/* Submit */}
            <button
                onClick={handleSubmit}
                disabled={!file || !modality || uploading}
                className="w-full py-3.5 rounded-xl bg-olive-800 text-cream-50 font-display font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed hover:bg-olive-900 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-olive-800/20"
            >
                {uploading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-cream-50/30 border-t-cream-50 rounded-full animate-spin" />
                        Analyzing scan...
                    </>
                ) : (
                    <>
                        <Upload className="w-5 h-5" />
                        Upload & Analyze
                    </>
                )}
            </button>
        </div>
    );
}

export default function DoctorNewScanPage() {
    return (
        <Suspense fallback={<div className="p-8 text-olive-600 flex items-center justify-center h-screen">Loading scan setup...</div>}>
            <NewScanContent />
        </Suspense>
    );
}
