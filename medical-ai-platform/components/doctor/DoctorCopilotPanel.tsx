"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

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

export default function DoctorCopilotPanel() {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [turns, setTurns] = useState<Turn[]>([]);
    const hasHydrated = useRef(false);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return;

            const parsed = JSON.parse(raw) as { message?: string; turns?: Turn[] };
            if (typeof parsed.message === "string") {
                setMessage(parsed.message);
            }
            if (Array.isArray(parsed.turns)) {
                setTurns(parsed.turns);
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
                JSON.stringify({ message, turns })
            );
        } catch {
            // Ignore storage write failures.
        }
    }, [message, turns]);

    const canSend = useMemo(() => message.trim().length > 0 && !loading, [message, loading]);

    async function handleSubmit(e?: FormEvent) {
        e?.preventDefault();
        const text = message.trim();
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
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            setError(msg);
        } finally {
            setLoading(false);
        }
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
