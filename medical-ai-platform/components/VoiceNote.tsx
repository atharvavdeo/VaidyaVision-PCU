
"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import VoiceInputButton from "./voice/VoiceInputButton";

interface VoiceNoteProps {
    scanId: number;
    onSaved?: () => void;
}

export default function VoiceNote({ scanId, onSaved }: VoiceNoteProps) {
    const [transcript, setTranscript] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const saveNote = async () => {
        if (!transcript.trim()) return;

        setIsSaving(true);
        try {
            const res = await fetch("/api/voice-notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ scanId, transcription: transcript }),
            });

            if (res.ok) {
                setTranscript("");
                if (onSaved) onSaved();
                alert("Voice note saved!");
            }
        } catch (error) {
            console.error("Failed to save voice note", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-sage-200">
            <h3 className="font-display text-sm font-bold text-olive-800 mb-3 uppercase tracking-wide">
                Voice Notes
            </h3>

            <div className="relative">
                <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Tap the mic to dictate, or type here..."
                    className="w-full h-24 p-2 pr-10 bg-cream-50 border border-sage-300 rounded-lg text-sm mb-3 focus:outline-none focus:border-olive-500"
                />
                <div className="absolute bottom-5 right-2">
                    <VoiceInputButton
                        onTranscript={() => {}}
                        mode="append-block"
                        currentValue={transcript}
                        onValueChange={setTranscript}
                        compact
                    />
                </div>
            </div>

            <div className="flex gap-2 justify-end">
                <button
                    onClick={saveNote}
                    disabled={isSaving || !transcript.trim()}
                    className="flex items-center gap-2 px-3 py-2 bg-olive-800 text-cream-50 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-olive-900 transition-colors disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Note
                </button>
            </div>
        </div>
    );
}
