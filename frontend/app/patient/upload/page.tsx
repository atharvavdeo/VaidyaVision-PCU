"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Upload,
    Brain,
    HeartPulse,
    Scan,
    Stethoscope,
    X,
    FileImage,
    AlertCircle,
} from "lucide-react";

const MODALITIES = [
    { id: "brain", label: "Brain MRI", icon: Brain, color: "bg-sage-100 text-olive-700 border-sage-300", activeColor: "bg-olive-800 text-cream-50 border-olive-800" },
    { id: "lung", label: "Lung X-ray", icon: Stethoscope, color: "bg-sage-100 text-olive-700 border-sage-300", activeColor: "bg-olive-800 text-cream-50 border-olive-800" },
    { id: "skin", label: "Skin Photo", icon: Scan, color: "bg-sage-100 text-olive-700 border-sage-300", activeColor: "bg-olive-800 text-cream-50 border-olive-800" },
    { id: "ecg", label: "ECG Image", icon: HeartPulse, color: "bg-sage-100 text-olive-700 border-sage-300", activeColor: "bg-olive-800 text-cream-50 border-olive-800" },
] as const;

export default function PatientUploadPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [modality, setModality] = useState<string | null>(null);
    const [symptoms, setSymptoms] = useState("");
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);

    const handleFile = useCallback((f: File) => {
        if (!f.type.startsWith("image/")) {
            setError("Please upload an image file (JPEG, PNG)");
            return;
        }
        setFile(f);
        setError(null);
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(f);
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

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Upload failed");
            }

            const data = await res.json();
            // Upload route already triggers ML inference — go to results
            router.push(`/patient/scans/${data.scanId}`);
        } catch (err: any) {
            setError(err.message || "Upload failed. Please try again.");
            setUploading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-display font-bold text-olive-900">Upload Medical Scan</h1>
                <p className="text-olive-500 mt-1">
                    Upload your medical image for AI-powered analysis. Our system will automatically detect the scan type and provide preliminary results.
                </p>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Step 1: Modality Selection */}
            <div className="bento-card">
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-olive-800 mb-4">
                    1. Select Scan Type
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {MODALITIES.map((m) => {
                        const Icon = m.icon;
                        const isActive = modality === m.id;
                        return (
                            <button
                                key={m.id}
                                onClick={() => setModality(m.id)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all hover:scale-105 ${isActive ? m.activeColor : m.color
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
            <div className="bento-card">
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-olive-800 mb-4">
                    2. Upload Image
                </h2>

                {preview ? (
                    <div className="relative">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full max-h-80 object-contain rounded-lg bg-cream-200"
                        />
                        <button
                            onClick={() => {
                                setFile(null);
                                setPreview(null);
                            }}
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
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${dragOver
                                ? "border-olive-500 bg-sage-100"
                                : "border-sage-300 hover:border-olive-500"
                            }`}
                        onClick={() => document.getElementById("file-input")?.click()}
                    >
                        <Upload className="w-10 h-10 mx-auto mb-3 text-olive-400" />
                        <p className="text-sm font-display font-bold text-olive-700">
                            Drag & drop your scan here, or click to browse
                        </p>
                        <p className="text-xs text-olive-400 mt-1">
                            Supports JPEG, PNG • Max 10MB
                        </p>
                        <input
                            id="file-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFile(f);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Step 3: Symptoms (Optional) */}
            <div className="bento-card">
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-olive-800 mb-1">
                    3. Symptoms <span className="text-olive-400 font-normal normal-case tracking-normal">(optional)</span>
                </h2>
                <p className="text-xs text-olive-400 mb-3">
                    Describe any symptoms you're experiencing to help your doctor
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
