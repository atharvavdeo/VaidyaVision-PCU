"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Upload, FileText, Pill, AlertCircle, CheckCircle,
    Loader2, X, FileImage, Clock, Stethoscope,
    ChevronDown, ChevronUp, Users, Search,
} from "lucide-react";

interface Patient {
    id: number;
    name: string;
    email: string;
}

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

export default function DoctorUploadPrescriptionPage() {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [step, setStep] = useState<"select" | "upload" | "extracting" | "cleaning" | "done">("select");
    const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [showRawText, setShowRawText] = useState(false);

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
            }
        };
        fetchPatients();
    }, []);

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

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, [handleFile]);

    const processDocument = async () => {
        if (!file) return;
        setProcessing(true);
        setError(null);
        setStep("cleaning");
        try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/ocr", { method: "POST", body: formData });
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
        if (!ocrResult || !file || !selectedPatient) return;
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("ocrResult", JSON.stringify(ocrResult));
            formData.append("patientId", selectedPatient.id.toString());
            const res = await fetch("/api/ocr/save", { method: "POST", body: formData });
            if (!res.ok) throw new Error("Failed to save");
            const data = await res.json();
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
        setStep(selectedPatient ? "upload" : "select");
        setSaved(false);
    };

    const filteredPatients = patients.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-olive-900 font-display">Upload Prescription</h1>
                <p className="text-olive-600 mt-1">
                    Upload a prescription for a patient. AI will extract medications and add them to the patient&apos;s record.
                </p>
            </div>

            {/* Step 1: Select Patient */}
            {!selectedPatient ? (
                <div className="bg-white border border-sage-200 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-olive-900 mb-3 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Select Patient
                    </h3>
                    <div className="relative mb-3">
                        <Search className="w-4 h-4 text-olive-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search patients..."
                            className="w-full pl-9 pr-3 py-2 border border-sage-300 rounded-lg text-olive-900 text-sm focus:ring-2 focus:ring-olive-500"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-sage-100 border border-sage-200 rounded-lg">
                        {filteredPatients.map((patient) => (
                            <button
                                key={patient.id}
                                onClick={() => { setSelectedPatient(patient); setStep("upload"); }}
                                className="w-full text-left px-4 py-3 hover:bg-sage-50 transition-colors flex items-center gap-3"
                            >
                                <div className="w-8 h-8 bg-olive-100 rounded-full flex items-center justify-center">
                                    <Users className="w-4 h-4 text-olive-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-olive-900">{patient.name}</p>
                                    <p className="text-xs text-olive-500">{patient.email}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <>
                    {/* Selected Patient Badge */}
                    <div className="flex items-center gap-3 bg-sage-50 border border-sage-200 rounded-xl px-4 py-3">
                        <Users className="w-5 h-5 text-olive-600" />
                        <div>
                            <p className="text-sm font-medium text-olive-900">{selectedPatient.name}</p>
                            <p className="text-xs text-olive-500">{selectedPatient.email}</p>
                        </div>
                        <button
                            onClick={() => { setSelectedPatient(null); setStep("select"); reset(); }}
                            className="ml-auto text-xs text-olive-500 hover:text-olive-700 underline"
                        >
                            Change patient
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Upload Area */}
                        <div className="space-y-4">
                            <div
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleDrop}
                                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                                    dragOver ? "border-olive-700 bg-sage-100" :
                                    file ? "border-sage-300 bg-cream-50" :
                                    "border-sage-300 bg-white hover:border-olive-600 hover:bg-sage-50"
                                }`}
                            >
                                {file ? (
                                    <div className="space-y-4">
                                        {preview ? (
                                            <img src={preview} alt="Document preview" className="max-h-64 mx-auto rounded-lg shadow-sm" />
                                        ) : (
                                            <div className="flex items-center justify-center gap-3 py-8">
                                                <FileText className="w-12 h-12 text-olive-700" />
                                                <span className="text-olive-800 font-medium">{file.name}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-center gap-3">
                                            <span className="text-sm text-olive-600">{(file.size / 1024).toFixed(1)} KB</span>
                                            <button onClick={reset} className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
                                                <X className="w-3 h-3" /> Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="cursor-pointer block">
                                        <FileImage className="w-12 h-12 text-olive-400 mx-auto mb-3" />
                                        <p className="text-olive-700 font-medium">Drop prescription here or click to browse</p>
                                        <p className="text-olive-500 text-sm mt-1">Supports JPEG, PNG, WebP, PDF (max 10MB)</p>
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,application/pdf"
                                            className="hidden"
                                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                                        />
                                    </label>
                                )}
                            </div>

                            {file && step === "upload" && (
                                <button
                                    onClick={processDocument}
                                    disabled={processing}
                                    className="w-full py-3 px-6 bg-olive-800 text-cream-50 rounded-xl font-medium hover:bg-olive-900 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {processing ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                                    ) : (
                                        <><Stethoscope className="w-5 h-5" /> Extract & Analyze</>
                                    )}
                                </button>
                            )}

                            {processing && (
                                <div className="bg-sage-50 border border-sage-200 rounded-xl p-4 flex items-center gap-3">
                                    <Loader2 className="w-5 h-5 text-olive-700 animate-spin" />
                                    <p className="text-olive-800 font-medium text-sm">AI is extracting and structuring data...</p>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                                    <p className="text-red-600 text-sm">{error}</p>
                                </div>
                            )}
                        </div>

                        {/* Results */}
                        <div className="space-y-4">
                            {ocrResult && step === "done" ? (
                                <>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-olive-800 text-cream-50 rounded-full text-sm font-medium capitalize">
                                            {ocrResult.document_type?.replace(/_/g, " ") || "Document"}
                                        </span>
                                        {ocrResult.confidence !== undefined && (
                                            <span className="text-sm text-olive-600">{(ocrResult.confidence * 100).toFixed(1)}% confidence</span>
                                        )}
                                    </div>

                                    {ocrResult.structured_data && (
                                        <div className="bg-white border border-sage-200 rounded-xl overflow-hidden">
                                            {(ocrResult.structured_data.doctor_name || ocrResult.structured_data.patient_name) && (
                                                <div className="p-4 border-b border-sage-200 bg-sage-50 space-y-1">
                                                    {ocrResult.structured_data.doctor_name && (
                                                        <p className="text-sm text-olive-700"><span className="font-medium">Doctor:</span> {ocrResult.structured_data.doctor_name}</p>
                                                    )}
                                                    {ocrResult.structured_data.patient_name && (
                                                        <p className="text-sm text-olive-700"><span className="font-medium">Patient:</span> {ocrResult.structured_data.patient_name}</p>
                                                    )}
                                                    {ocrResult.structured_data.diagnosis && (
                                                        <p className="text-sm text-olive-700"><span className="font-medium">Diagnosis:</span> {ocrResult.structured_data.diagnosis}</p>
                                                    )}
                                                </div>
                                            )}

                                            {ocrResult.structured_data.medications && ocrResult.structured_data.medications.length > 0 && (
                                                <div className="p-4">
                                                    <h3 className="text-sm font-semibold text-olive-800 mb-3 flex items-center gap-2">
                                                        <Pill className="w-4 h-4" />
                                                        Medications ({ocrResult.structured_data.medications.length})
                                                        <span className="text-xs text-olive-500 font-normal">— will be auto-added to patient&apos;s schedule</span>
                                                    </h3>
                                                    <div className="space-y-2">
                                                        {ocrResult.structured_data.medications.map((med, i) => (
                                                            <div key={i} className="bg-sage-50 border border-sage-200 rounded-lg p-3">
                                                                <div className="flex items-start justify-between">
                                                                    <div>
                                                                        <p className="font-medium text-olive-900">{med.drug_name}</p>
                                                                        <p className="text-sm text-olive-600 mt-0.5">
                                                                            {med.dosage}{med.form ? ` (${med.form})` : ""}
                                                                        </p>
                                                                    </div>
                                                                    {med.frequency && (
                                                                        <span className="text-xs px-2 py-1 bg-olive-100 text-olive-700 rounded-full flex items-center gap-1">
                                                                            <Clock className="w-3 h-3" />{med.frequency}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {ocrResult.raw_text && (
                                        <div className="bg-white border border-sage-200 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => setShowRawText(!showRawText)}
                                                className="w-full p-3 flex items-center justify-between text-sm text-olive-600 hover:bg-sage-50"
                                            >
                                                <span>Raw OCR Output</span>
                                                {showRawText ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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

                                    <div className="flex gap-3">
                                        <button
                                            onClick={saveToRecords}
                                            disabled={saving || saved}
                                            className="flex-1 py-2.5 px-4 bg-olive-800 text-cream-50 rounded-xl font-medium hover:bg-olive-900 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {saved ? (
                                                <><CheckCircle className="w-4 h-4" /> Saved & Medications Added</>
                                            ) : saving ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                            ) : (
                                                <><FileText className="w-4 h-4" /> Save to Patient Record</>
                                            )}
                                        </button>
                                        <button onClick={reset} className="py-2.5 px-4 border border-sage-300 text-olive-700 rounded-xl font-medium hover:bg-sage-50">
                                            New Upload
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-sage-50 border border-sage-200 rounded-xl p-8 text-center">
                                    <FileText className="w-12 h-12 text-olive-400 mx-auto mb-3" />
                                    <p className="text-olive-700 font-medium">Results will appear here</p>
                                    <p className="text-olive-500 text-sm mt-1">Upload a prescription to extract medications</p>
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
