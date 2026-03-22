"use client";

import { useState, useCallback } from "react";
import {
    Upload,
    FileText,
    Pill,
    AlertCircle,
    CheckCircle,
    Loader2,
    X,
    FileImage,
    Clock,
    Stethoscope,
    ChevronDown,
    ChevronUp,
} from "lucide-react";

interface Medication {
    drug_name: string;
    dosage: string;
    frequency?: string;
    duration?: string;
    instructions?: string;
    form?: string;
}

interface StructuredData {
    document_type: string;
    doctor_name?: string;
    patient_name?: string;
    date?: string;
    diagnosis?: string;
    medications?: Medication[];
    special_instructions?: string;
    follow_up?: string;
    cleaned_text?: string;
    results?: Array<{
        test_name: string;
        value: string;
        unit: string;
        reference_range: string;
        status: string;
    }>;
    [key: string]: unknown;
}

interface OCRResult {
    status: string;
    raw_text?: string;
    cleaned_text?: string;
    structured_data?: StructuredData;
    document_type?: string;
    confidence?: number;
    method_used?: string;
    error?: string;
}

export default function UploadPrescriptionPage() {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [step, setStep] = useState<"upload" | "extracting" | "cleaning" | "done">("upload");
    const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showRawText, setShowRawText] = useState(false);

    const handleFile = useCallback((f: File) => {
        const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
        if (!validTypes.includes(f.type)) {
            setError("Please upload an image (JPEG, PNG, WebP) or PDF file");
            return;
        }
        if (f.size > 10 * 1024 * 1024) {
            setError("File size must be under 10MB");
            return;
        }
        setFile(f);
        setError(null);
        setOcrResult(null);
        setSaved(false);

        if (f.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(f);
        } else {
            setPreview(null);
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

    const processDocument = async () => {
        if (!file) return;

        setProcessing(true);
        setError(null);
        setStep("extracting");

        try {
            const formData = new FormData();
            formData.append("file", file);

            // Step 1: Extract + Clean in one call
            setStep("cleaning");
            const res = await fetch("/api/ocr", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "OCR processing failed");
            }

            const data: OCRResult = await res.json();
            setOcrResult(data);
            setStep("done");
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : "Processing failed";
            setError(errorMessage);
            setStep("upload");
        } finally {
            setProcessing(false);
        }
    };

    const saveToRecords = async () => {
        if (!ocrResult || !file) return;
        setSaving(true);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("ocrResult", JSON.stringify(ocrResult));

            const res = await fetch("/api/ocr/save", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Failed to save");
            setSaved(true);
        } catch {
            setError("Failed to save to records");
        } finally {
            setSaving(false);
        }
    };

    const reset = () => {
        setFile(null);
        setPreview(null);
        setOcrResult(null);
        setError(null);
        setStep("upload");
        setSaved(false);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-olive-900 font-display">
                    Upload Prescription
                </h1>
                <p className="text-olive-600 mt-1">
                    Upload a prescription, lab report, or medical document. Our AI will extract and organize the information.
                </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-4">
                {[
                    { key: "upload", label: "Upload", icon: Upload },
                    { key: "extracting", label: "Extract Text", icon: FileText },
                    { key: "cleaning", label: "AI Cleaning", icon: Stethoscope },
                    { key: "done", label: "Results", icon: CheckCircle },
                ].map((s, i) => {
                    const isActive = s.key === step;
                    const isDone =
                        ["extracting", "cleaning", "done"].indexOf(step) >
                        ["extracting", "cleaning", "done"].indexOf(s.key as string);
                    const Icon = s.icon;
                    return (
                        <div key={s.key} className="flex items-center gap-2">
                            {i > 0 && (
                                <div
                                    className={`h-0.5 w-8 ${isDone || isActive ? "bg-olive-700" : "bg-sage-300"
                                        }`}
                                />
                            )}
                            <div
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isActive
                                    ? "bg-olive-800 text-cream-50"
                                    : isDone
                                        ? "bg-sage-200 text-olive-800"
                                        : "bg-sage-100 text-olive-500"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{s.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Upload Area */}
                <div className="space-y-4">
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragOver
                            ? "border-olive-700 bg-sage-100"
                            : file
                                ? "border-sage-300 bg-cream-50"
                                : "border-sage-300 bg-white hover:border-olive-600 hover:bg-sage-50"
                            }`}
                    >
                        {file ? (
                            <div className="space-y-4">
                                {preview ? (
                                    <img
                                        src={preview}
                                        alt="Document preview"
                                        className="max-h-64 mx-auto rounded-lg shadow-sm"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center gap-3 py-8">
                                        <FileText className="w-12 h-12 text-olive-700" />
                                        <span className="text-olive-800 font-medium">
                                            {file.name}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-sm text-olive-600">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </span>
                                    <button
                                        onClick={reset}
                                        className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                                    >
                                        <X className="w-3 h-3" /> Remove
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label className="cursor-pointer block">
                                <FileImage className="w-12 h-12 text-olive-400 mx-auto mb-3" />
                                <p className="text-olive-700 font-medium">
                                    Drop your document here or click to browse
                                </p>
                                <p className="text-olive-500 text-sm mt-1">
                                    Supports JPEG, PNG, WebP, PDF (max 10MB)
                                </p>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,application/pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleFile(f);
                                    }}
                                />
                            </label>
                        )}
                    </div>

                    {/* Process Button */}
                    {file && step === "upload" && (
                        <button
                            onClick={processDocument}
                            disabled={processing}
                            className="w-full py-3 px-6 bg-olive-800 text-cream-50 rounded-xl font-medium hover:bg-olive-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Stethoscope className="w-5 h-5" />
                                    Extract & Analyze
                                </>
                            )}
                        </button>
                    )}

                    {/* Processing indicator */}
                    {processing && (
                        <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-olive-700 animate-spin" />
                            <div>
                                <p className="text-olive-800 font-medium text-sm">
                                    {step === "extracting"
                                        ? "Extracting text from document..."
                                        : "AI is cleaning and structuring data..."}
                                </p>
                                <p className="text-olive-500 text-xs mt-0.5">
                                    This may take a few seconds
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                            <div>
                                <p className="text-red-700 font-medium text-sm">Error</p>
                                <p className="text-red-600 text-sm">{error}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Results */}
                <div className="space-y-4">
                    {ocrResult && step === "done" && (
                        <>
                            {/* Document Type Badge */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-olive-800 text-cream-50 rounded-full text-sm font-medium capitalize">
                                        {ocrResult.document_type?.replace(/_/g, " ") || "Document"}
                                    </span>
                                    {ocrResult.confidence !== undefined && (
                                        <span className="text-sm text-olive-600">
                                            {(ocrResult.confidence * 100).toFixed(1)}% OCR confidence
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Structured Data */}
                            {ocrResult.structured_data && (
                                <div className="bg-white border border-sage-200 rounded-xl overflow-hidden">
                                    {/* Header Info */}
                                    {(ocrResult.structured_data.doctor_name ||
                                        ocrResult.structured_data.patient_name ||
                                        ocrResult.structured_data.date) && (
                                            <div className="p-4 border-b border-sage-200 bg-sage-50 space-y-1">
                                                {ocrResult.structured_data.doctor_name && (
                                                    <p className="text-sm text-olive-700">
                                                        <span className="font-medium">Doctor:</span>{" "}
                                                        {ocrResult.structured_data.doctor_name}
                                                    </p>
                                                )}
                                                {ocrResult.structured_data.patient_name && (
                                                    <p className="text-sm text-olive-700">
                                                        <span className="font-medium">Patient:</span>{" "}
                                                        {ocrResult.structured_data.patient_name}
                                                    </p>
                                                )}
                                                {ocrResult.structured_data.date && (
                                                    <p className="text-sm text-olive-700">
                                                        <span className="font-medium">Date:</span>{" "}
                                                        {ocrResult.structured_data.date}
                                                    </p>
                                                )}
                                                {ocrResult.structured_data.diagnosis && (
                                                    <p className="text-sm text-olive-700">
                                                        <span className="font-medium">Diagnosis:</span>{" "}
                                                        {ocrResult.structured_data.diagnosis}
                                                    </p>
                                                )}
                                            </div>
                                        )}

                                    {/* Medications */}
                                    {ocrResult.structured_data.medications &&
                                        ocrResult.structured_data.medications.length > 0 && (
                                            <div className="p-4">
                                                <h3 className="text-sm font-semibold text-olive-800 mb-3 flex items-center gap-2">
                                                    <Pill className="w-4 h-4" />
                                                    Medications ({ocrResult.structured_data.medications.length})
                                                </h3>
                                                <div className="space-y-3">
                                                    {ocrResult.structured_data.medications.map(
                                                        (med: Medication, i: number) => (
                                                            <div
                                                                key={i}
                                                                className="bg-sage-50 border border-sage-200 rounded-lg p-3"
                                                            >
                                                                <div className="flex items-start justify-between">
                                                                    <div>
                                                                        <p className="font-medium text-olive-900">
                                                                            {med.drug_name}
                                                                        </p>
                                                                        {med.dosage && (
                                                                            <p className="text-sm text-olive-600 mt-0.5">
                                                                                {med.dosage}
                                                                                {med.form ? ` (${med.form})` : ""}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    {med.frequency && (
                                                                        <span className="text-xs px-2 py-1 bg-olive-100 text-olive-700 rounded-full flex items-center gap-1">
                                                                            <Clock className="w-3 h-3" />
                                                                            {med.frequency}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {med.duration && (
                                                                    <p className="text-xs text-olive-500 mt-1">
                                                                        Duration: {med.duration}
                                                                    </p>
                                                                )}
                                                                {med.instructions && (
                                                                    <p className="text-xs text-olive-600 mt-1 italic">
                                                                        {med.instructions}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                    {/* Lab Results */}
                                    {ocrResult.structured_data.results &&
                                        ocrResult.structured_data.results.length > 0 && (
                                            <div className="p-4 border-t border-sage-200">
                                                <h3 className="text-sm font-semibold text-olive-800 mb-3">
                                                    Lab Results
                                                </h3>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="text-left text-olive-600">
                                                                <th className="pb-2">Test</th>
                                                                <th className="pb-2">Value</th>
                                                                <th className="pb-2">Range</th>
                                                                <th className="pb-2">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {ocrResult.structured_data.results.map(
                                                                (r, i) => (
                                                                    <tr
                                                                        key={i}
                                                                        className="border-t border-sage-100"
                                                                    >
                                                                        <td className="py-1.5 text-olive-800">
                                                                            {r.test_name}
                                                                        </td>
                                                                        <td className="py-1.5 font-medium text-olive-900">
                                                                            {r.value} {r.unit}
                                                                        </td>
                                                                        <td className="py-1.5 text-olive-500">
                                                                            {r.reference_range}
                                                                        </td>
                                                                        <td className="py-1.5">
                                                                            <span
                                                                                className={`text-xs px-2 py-0.5 rounded-full ${r.status === "normal"
                                                                                    ? "bg-green-100 text-green-700"
                                                                                    : r.status === "critical"
                                                                                        ? "bg-red-100 text-red-700"
                                                                                        : "bg-amber-100 text-amber-700"
                                                                                    }`}
                                                                            >
                                                                                {r.status}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                    {/* Special Instructions */}
                                    {ocrResult.structured_data.special_instructions && (
                                        <div className="p-4 border-t border-sage-200">
                                            <h3 className="text-sm font-semibold text-olive-800 mb-1">
                                                Special Instructions
                                            </h3>
                                            <p className="text-sm text-olive-600">
                                                {ocrResult.structured_data.special_instructions}
                                            </p>
                                        </div>
                                    )}

                                    {/* Follow-up */}
                                    {ocrResult.structured_data.follow_up && (
                                        <div className="p-4 border-t border-sage-200">
                                            <h3 className="text-sm font-semibold text-olive-800 mb-1">
                                                Follow-up
                                            </h3>
                                            <p className="text-sm text-olive-600">
                                                {ocrResult.structured_data.follow_up}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Cleaned Text */}
                            {ocrResult.cleaned_text && (
                                <div className="bg-white border border-sage-200 rounded-xl p-4">
                                    <h3 className="text-sm font-semibold text-olive-800 mb-2">
                                        Cleaned Text
                                    </h3>
                                    <p className="text-sm text-olive-700 whitespace-pre-wrap leading-relaxed">
                                        {ocrResult.cleaned_text}
                                    </p>
                                </div>
                            )}

                            {/* Raw OCR Text (collapsible) */}
                            {ocrResult.raw_text && (
                                <div className="bg-white border border-sage-200 rounded-xl overflow-hidden">
                                    <button
                                        onClick={() => setShowRawText(!showRawText)}
                                        className="w-full p-3 flex items-center justify-between text-sm text-olive-600 hover:bg-sage-50 transition-colors"
                                    >
                                        <span>Raw OCR Output</span>
                                        {showRawText ? (
                                            <ChevronUp className="w-4 h-4" />
                                        ) : (
                                            <ChevronDown className="w-4 h-4" />
                                        )}
                                    </button>
                                    {showRawText && (
                                        <div className="p-3 pt-0">
                                            <pre className="text-xs text-olive-500 whitespace-pre-wrap bg-sage-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                                                {ocrResult.raw_text}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={saveToRecords}
                                    disabled={saving || saved}
                                    className="flex-1 py-2.5 px-4 bg-olive-800 text-cream-50 rounded-xl font-medium hover:bg-olive-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {saved ? (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            Saved to Records
                                        </>
                                    ) : saving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="w-4 h-4" />
                                            Save to My Records
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={reset}
                                    className="py-2.5 px-4 border border-sage-300 text-olive-700 rounded-xl font-medium hover:bg-sage-50 transition-colors"
                                >
                                    Upload Another
                                </button>
                            </div>
                        </>
                    )}

                    {/* Empty state */}
                    {!ocrResult && step === "upload" && (
                        <div className="bg-sage-50 border border-sage-200 rounded-xl p-8 text-center">
                            <FileText className="w-12 h-12 text-olive-400 mx-auto mb-3" />
                            <p className="text-olive-700 font-medium">
                                Results will appear here
                            </p>
                            <p className="text-olive-500 text-sm mt-1">
                                Upload a prescription or medical document to get started
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
