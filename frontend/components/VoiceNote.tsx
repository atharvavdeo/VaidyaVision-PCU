
"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Square, Loader2, Save } from "lucide-react";

interface VoiceNoteProps {
    scanId: number;
    onSaved?: () => void;
}

export default function VoiceNote({ scanId, onSaved }: VoiceNoteProps) {
    const [transcript, setTranscript] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window !== "undefined" && (window as any).webkitSpeechRecognition) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event: any) => {
                let currentTranscript = "";
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    currentTranscript += event.results[i][0].transcript;
                }
                // Append or replace? Simple replacement for continuous stream
                // Ideally, you'd merge committed results
                setTranscript(prev => prev + " " + currentTranscript);
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert("Voice recognition not supported in this browser.");
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            // Clear previous for new session or append? Let's just append.
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

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

            <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Transcribed text will appear here... (Press mic to start)"
                className="w-full h-24 p-2 bg-cream-50 border border-sage-300 rounded-lg text-sm mb-3 focus:outline-none focus:border-olive-500"
            />

            <div className="flex gap-2 justify-end">
                <button
                    onClick={toggleListening}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${isListening
                            ? "bg-red-100 text-red-600 animate-pulse border border-red-200"
                            : "bg-sage-100 text-olive-800 hover:bg-sage-200 border border-sage-300"
                        }`}
                >
                    {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isListening ? "Stop Rec" : "Record"}
                </button>

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
