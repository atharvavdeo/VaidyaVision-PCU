"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Square, Volume2, VolumeX } from "lucide-react";
import VoiceInputButton from "@/components/voice/VoiceInputButton";

type Candidate = {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
};

type CopilotResponse = {
    ok: boolean;
    summary?: string;
    sections?: Array<{ title: string; points: string[] }>;
    risks?: string[];
    pendingItems?: string[];
    sourcesUsed?: {
        scans?: number;
        reports?: number;
        prescriptions?: number;
        medications?: number;
        appointments?: number;
        cases?: number;
        artifacts?: number;
        caseReports?: number;
        notes?: number;
        messages?: number;
        voiceNotes?: number;
    };
    question?: string;
    needsClarification?: boolean;
    candidates?: Candidate[];
    error?: string;
};

type Turn = {
    id: number;
    role: "doctor" | "copilot";
    text: string;
    details?: CopilotResponse;
};

const SUGGESTED_PROMPTS = [
    "Give me a full brief for Rahul Verma",
    "What changed for Sneha Patel in the last 7 days?",
    "Summarize latest scans, prescriptions, and appointments for Kawaljeet",
];

const STORAGE_KEY = "doctor-copilot-session-v1";

const SECTION_ORDER = [
    "Patient Overview",
    "Latest Updates",
    "Recent Scans and Reports",
    "Medications and Prescriptions",
    "Appointments and Follow-ups",
    "Doctor Notes / Clinical Notes",
    "Risks / Pending Attention Items",
];

function orderedSections(sections: Array<{ title: string; points: string[] }> = []) {
    return [...sections].sort((a, b) => {
        const ai = SECTION_ORDER.indexOf(a.title);
        const bi = SECTION_ORDER.indexOf(b.title);
        const safeAi = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
        const safeBi = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
        return safeAi - safeBi;
    });
}

function sectionBriefIntro(title: string): string {
    const normalized = title.toLowerCase();
    if (normalized.includes("patient overview")) return "Starting with patient overview";
    if (normalized.includes("latest updates")) return "Latest clinical updates";
    if (normalized.includes("scans") || normalized.includes("reports")) return "On scans and reports";
    if (normalized.includes("medications") || normalized.includes("prescriptions")) return "For medications and prescriptions";
    if (normalized.includes("appointments") || normalized.includes("follow")) return "For appointments and follow-ups";
    if (normalized.includes("doctor notes") || normalized.includes("clinical notes")) return "Doctor and clinical notes";
    if (normalized.includes("risk") || normalized.includes("pending")) return "Risks and pending attention items";
    return `Regarding ${title}`;
}

function toBriefingSentence(points: string[]): string {
    if (points.length === 0) return "No additional details are available.";
    if (points.length === 1) return `${points[0]}.`;
    const [first, ...rest] = points;
    const restJoined = rest.map((p) => `Also, ${p}.`).join(" ");
    return `${first}. ${restJoined}`;
}

function buildSpokenSegmentsForTurn(turn: Turn): string[] {
    if (turn.role !== "copilot") return [turn.text];

    const details = turn.details;
    if (!details?.sections || details.sections.length === 0) {
        return [turn.text];
    }

    const blocks: string[] = ["Doctor briefing for the selected patient."];
    if (turn.text?.trim()) {
        blocks.push(`Executive summary: ${turn.text.trim()}`);
    }

    const sections = orderedSections(details.sections);
    for (const section of sections) {
        if (!section?.title) continue;
        const points = Array.isArray(section.points)
            ? section.points.filter((p) => p && p.trim().length > 0)
            : [];

        if (points.length === 0) {
            blocks.push(`${sectionBriefIntro(section.title)}. No details available in this category.`);
            continue;
        }

        blocks.push(`${sectionBriefIntro(section.title)}. ${toBriefingSentence(points)}`);
    }

    if (Array.isArray(details.risks) && details.risks.length > 0) {
        blocks.push(`Priority risk alerts. ${toBriefingSentence(details.risks)}`);
    }

    if (Array.isArray(details.pendingItems) && details.pendingItems.length > 0) {
        blocks.push(`Pending follow-up actions. ${toBriefingSentence(details.pendingItems)}`);
    }

    blocks.push("End of briefing.");
    return blocks.map((b) => b.replace(/\s+/g, " ").trim()).filter(Boolean);
}

export default function DoctorCopilotPanel() {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [turns, setTurns] = useState<Turn[]>([]);
    const [autoReadEnabled, setAutoReadEnabled] = useState(true);
    const [speechSupported, setSpeechSupported] = useState(false);
    const [speakingTurnId, setSpeakingTurnId] = useState<number | null>(null);
    const hasHydrated = useRef(false);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const speechPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const speechTokenRef = useRef(0);

    const TTS_RATE = 1.5;
    const TTS_PITCH = 1;
    const SECTION_PAUSE_MS = 220;

    const stopSpeaking = () => {
        speechTokenRef.current += 1;
        if (speechPauseTimerRef.current) {
            clearTimeout(speechPauseTimerRef.current);
            speechPauseTimerRef.current = null;
        }
        if (!synthRef.current) return;
        synthRef.current.cancel();
        utteranceRef.current = null;
        setSpeakingTurnId(null);
    };

    const pickVoice = (): SpeechSynthesisVoice | null => {
        if (!synthRef.current) return null;
        const voices = synthRef.current.getVoices();
        if (!voices || voices.length === 0) return null;

        const preferred = voices.find((v) => /en-IN/i.test(v.lang))
            || voices.find((v) => /en-US|en-GB/i.test(v.lang))
            || voices.find((v) => /^en/i.test(v.lang));
        return preferred || voices[0] || null;
    };

    const speakSegments = (segments: string[], turnId: number) => {
        if (!synthRef.current) return;
        const cleaned = segments.map((s) => s.trim()).filter(Boolean);
        if (cleaned.length === 0) return;

        stopSpeaking();
        const speechToken = Date.now();
        speechTokenRef.current = speechToken;
        setSpeakingTurnId(turnId);

        let index = 0;

        const speakNext = () => {
            if (!synthRef.current || speechTokenRef.current !== speechToken) return;

            if (index >= cleaned.length) {
                utteranceRef.current = null;
                setSpeakingTurnId((current) => (current === turnId ? null : current));
                return;
            }

            const utter = new SpeechSynthesisUtterance(cleaned[index]);
            const voice = pickVoice();
            if (voice) utter.voice = voice;
            utter.rate = TTS_RATE;
            utter.pitch = TTS_PITCH;

            utter.onend = () => {
                if (speechTokenRef.current !== speechToken) return;
                index += 1;
                speechPauseTimerRef.current = setTimeout(() => {
                    speakNext();
                }, SECTION_PAUSE_MS);
            };

            utter.onerror = () => {
                if (speechTokenRef.current !== speechToken) return;
                setSpeakingTurnId((current) => (current === turnId ? null : current));
                utteranceRef.current = null;
            };

            utteranceRef.current = utter;
            synthRef.current.speak(utter);
        };

        speakNext();
    };

    useEffect(() => {
        if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            setSpeechSupported(false);
            return;
        }

        synthRef.current = window.speechSynthesis;
        setSpeechSupported(true);

        return () => {
            if (speechPauseTimerRef.current) {
                clearTimeout(speechPauseTimerRef.current);
            }
            window.speechSynthesis.cancel();
        };
    }, []);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw) as { message?: string; turns?: Turn[]; autoReadEnabled?: boolean };
            if (typeof parsed.message === "string") {
                setMessage(parsed.message);
            }
            if (Array.isArray(parsed.turns)) {
                setTurns(parsed.turns);
            }
            if (typeof parsed.autoReadEnabled === "boolean") {
                setAutoReadEnabled(parsed.autoReadEnabled);
            }
        } catch {
            // Ignore malformed persisted state.
        } finally {
            hasHydrated.current = true;
        }
    }, []);

    useEffect(() => {
        if (!hasHydrated.current) return;
        try {
            sessionStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ message, turns, autoReadEnabled })
            );
        } catch {
            // Ignore storage write failures.
        }
    }, [message, turns, autoReadEnabled]);

    const canSend = useMemo(() => message.trim().length > 0 && !loading, [message, loading]);

    async function submitMessage(rawText: string) {
        const text = rawText.trim();
        if (!text || loading) return;

        const userTurn: Turn = {
            id: Date.now(),
            role: "doctor",
            text,
        };

        setTurns((prev) => [...prev, userTurn]);
        setMessage("");
        setError(null);
        setLoading(true);

        try {
            const res = await fetch("/api/doctor/copilot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text }),
            });

            const data: CopilotResponse = await res.json();

            if (!res.ok && !data.needsClarification) {
                throw new Error(data.error || "Failed to generate summary");
            }

            const copilotText = data.needsClarification
                ? data.question || "I need a bit more detail to continue."
                : data.summary || "No summary returned.";

            const copilotTurn: Turn = {
                id: Date.now() + 1,
                role: "copilot",
                text: copilotText,
                details: data,
            };

            setTurns((prev) => [...prev, copilotTurn]);

            if (speechSupported && autoReadEnabled) {
                speakSegments(buildSpokenSegmentsForTurn(copilotTurn), copilotTurn.id);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e?: FormEvent) {
        e?.preventDefault();
        await submitMessage(message);
    }

    return (
        <div className="rounded-xl border border-sage-300 bg-cream-50 p-4 md:p-6">
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-olive-900">Doctor Summary Copilot</h1>
                <p className="mt-1 text-sm text-olive-700">
                    Ask for a patient brief in natural language. The copilot fetches latest database context and summarizes it.
                </p>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                        key={prompt}
                        type="button"
                        onClick={() => setMessage(prompt)}
                        className="rounded-full border border-sage-300 bg-cream-100 px-3 py-1 text-xs text-olive-800 hover:bg-sage-200"
                    >
                        {prompt}
                    </button>
                ))}
            </div>

            <div className="mb-4 space-y-3 rounded-lg border border-sage-200 bg-cream-100 p-3 md:p-4 min-h-[280px] max-h-[520px] overflow-y-auto">
                {turns.length === 0 && (
                    <div className="text-sm text-olive-600">
                        Start by asking: <span className="font-semibold">Give me a full brief for Rahul Verma</span>
                    </div>
                )}

                {turns.map((turn) => (
                    <div
                        key={turn.id}
                        className={
                            turn.role === "doctor"
                                ? "ml-auto max-w-[90%] rounded-lg bg-olive-800 px-3 py-2 text-sm text-cream-50"
                                : "mr-auto max-w-[90%] rounded-lg border border-sage-300 bg-white px-3 py-2 text-sm text-olive-900"
                        }
                    >
                        {turn.role === "copilot" && speechSupported && (
                            <div className="mb-2 flex items-center justify-end gap-2">
                                {speakingTurnId === turn.id && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                                        Speaking...
                                    </span>
                                )}

                                {speakingTurnId === turn.id ? (
                                    <button
                                        type="button"
                                        onClick={stopSpeaking}
                                        className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
                                    >
                                        <Square className="h-3 w-3" />
                                        Stop
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => speakSegments(buildSpokenSegmentsForTurn(turn), turn.id)}
                                        className="inline-flex items-center gap-1 rounded-md border border-sage-300 bg-cream-100 px-2 py-1 text-[11px] font-medium text-olive-700 hover:bg-sage-200"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                        Replay
                                    </button>
                                )}
                            </div>
                        )}

                        {!(turn.role === "copilot" && turn.details?.sections && turn.details.sections.length > 0) && (
                            <p className="whitespace-pre-wrap">{turn.text}</p>
                        )}

                        {turn.role === "copilot" && turn.details?.sections && turn.details.sections.length > 0 && (
                            <div className="mt-3 space-y-3 border-t border-sage-200 pt-2">
                                <div className="rounded-md border border-sage-200 bg-cream-50 px-3 py-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-olive-700">Quick Glance</p>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                        <span className="rounded-full bg-sage-200 px-2 py-1 text-olive-800">Scans: {turn.details.sourcesUsed?.scans ?? "-"}</span>
                                        <span className="rounded-full bg-sage-200 px-2 py-1 text-olive-800">Reports: {turn.details.sourcesUsed?.reports ?? "-"}</span>
                                        <span className="rounded-full bg-sage-200 px-2 py-1 text-olive-800">Meds: {turn.details.sourcesUsed?.medications ?? "-"}</span>
                                        <span className="rounded-full bg-sage-200 px-2 py-1 text-olive-800">Appointments: {turn.details.sourcesUsed?.appointments ?? "-"}</span>
                                        {(turn.details.risks || []).slice(0, 1).map((risk, idx) => (
                                            <span key={`risk-top-${idx}`} className="rounded-full bg-red-100 px-2 py-1 text-red-700">Risk Flag</span>
                                        ))}
                                        {(turn.details.pendingItems || []).slice(0, 1).map((item, idx) => (
                                            <span key={`pending-top-${idx}`} className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">Pending Follow-up</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {orderedSections(turn.details.sections).map((section) => (
                                    <div key={section.title} className="rounded-md border border-sage-200 bg-cream-50 p-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-wide text-olive-700">{section.title}</h3>
                                        <ul className="mt-1 list-disc pl-4 text-xs text-olive-800">
                                            {section.points.map((point, idx) => (
                                                <li key={`${section.title}-${idx}`}>{point}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                                </div>

                                {(turn.details.risks?.length || turn.details.pendingItems?.length) ? (
                                    <div className="flex flex-wrap gap-2">
                                        {(turn.details.risks || []).slice(0, 3).map((risk, idx) => (
                                            <span key={`risk-${idx}`} className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                                                Risk: {risk}
                                            </span>
                                        ))}
                                        {(turn.details.pendingItems || []).slice(0, 3).map((item, idx) => (
                                            <span key={`pending-${idx}`} className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700">
                                                Pending: {item}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        )}

                        {turn.role === "copilot" && turn.details?.needsClarification && turn.details.candidates && turn.details.candidates.length > 0 && (
                            <div className="mt-3 space-y-1 border-t border-sage-200 pt-2 text-xs text-olive-800">
                                <p className="font-semibold">Possible patients:</p>
                                {turn.details.candidates.map((c) => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        className="block w-full rounded-md border border-sage-300 bg-cream-100 px-2 py-1 text-left hover:bg-sage-200"
                                        onClick={() => setMessage(`Give me a full brief for patient id ${c.id}`)}
                                    >
                                        {c.name} ({c.email})
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {error && (
                <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
                <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Ask for a patient summary..."
                    className="w-full rounded-lg border border-sage-300 bg-white px-3 py-2 text-sm text-olive-900 outline-none ring-0 focus:border-olive-500"
                />

                <div className="flex items-center justify-end gap-2">
                    <VoiceInputButton
                        onTranscript={(text) => {
                            void submitMessage(text);
                        }}
                        mode="submit"
                        disabled={loading}
                        compact
                        title="Dictate and auto-send"
                    />

                    {speechSupported && (
                        <button
                            type="button"
                            onClick={() => {
                                if (autoReadEnabled) {
                                    stopSpeaking();
                                }
                                setAutoReadEnabled((prev) => !prev);
                            }}
                            className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-xs font-medium ${autoReadEnabled
                                ? "border-sage-300 bg-cream-100 text-olive-700 hover:bg-sage-200"
                                : "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                }`}
                            title={autoReadEnabled ? "Auto-read enabled" : "Auto-read muted"}
                        >
                            {autoReadEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                            {autoReadEnabled ? "Auto-read On" : "Auto-read Off"}
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => setMessage("")}
                        className="rounded-md border border-sage-300 px-3 py-2 text-sm text-olive-700 hover:bg-sage-200"
                    >
                        Clear
                    </button>
                    <button
                        type="submit"
                        disabled={!canSend}
                        className="rounded-md bg-olive-800 px-4 py-2 text-sm font-semibold text-cream-50 disabled:cursor-not-allowed disabled:opacity-60 hover:bg-olive-900"
                    >
                        {loading ? "Summarizing..." : "Send"}
                    </button>
                </div>
            </form>
        </div>
    );
}
