"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type TranscriptMode = "submit" | "replace" | "append-inline" | "append-block";

interface UseVoiceInputOptions {
    maxDurationMs?: number;
    silenceMs?: number;
    language?: string;
}

interface UseVoiceInputReturn {
    isRecording: boolean;
    isTranscribing: boolean;
    error: string | null;
    volumeLevels: number[];
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    cancelRecording: () => void;
}

// ── Singleton guard: only one recording active across the entire app ──
let _activeRecorderId: string | null = null;

let _idCounter = 0;
function nextId() {
    return `voice-${++_idCounter}`;
}

export function useVoiceInput(
    onTranscript: (text: string) => void,
    options: UseVoiceInputOptions = {}
): UseVoiceInputReturn {
    const { maxDurationMs = 45000, silenceMs = 4000 } = options;

    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [volumeLevels, setVolumeLevels] = useState<number[]>([0, 0, 0, 0, 0]);

    const idRef = useRef(nextId());
    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animFrameRef = useRef<number>(0);
    const chunksRef = useRef<Blob[]>([]);
    const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSpeechRef = useRef<number>(Date.now());

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cleanup();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cleanup = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
        if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (_activeRecorderId === idRef.current) _activeRecorderId = null;
        recorderRef.current = null;
        analyserRef.current = null;
        chunksRef.current = [];
        setVolumeLevels([0, 0, 0, 0, 0]);
    }, []);

    const uploadAndTranscribe = useCallback(
        async (blob: Blob) => {
            setIsTranscribing(true);
            setError(null);
            try {
                const form = new FormData();
                form.append("file", blob, "recording.webm");
                const res = await fetch("/api/transcribe", { method: "POST", body: form });
                if (!res.ok) {
                    setError("Transcription unavailable");
                    return;
                }
                const data = await res.json();
                if (data.status === "success" && data.text && data.text.trim()) {
                    onTranscript(data.text.trim());
                } else if (data.status === "error") {
                    setError(data.error || "Transcription failed");
                } else {
                    setError("No speech detected");
                }
            } catch {
                setError("Transcription unavailable");
            } finally {
                setIsTranscribing(false);
            }
        },
        [onTranscript]
    );

    const stopRecording = useCallback(() => {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
            recorderRef.current.stop();
        }
        setIsRecording(false);
    }, []);

    const cancelRecording = useCallback(() => {
        chunksRef.current = []; // discard
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
            recorderRef.current.stop();
        }
        setIsRecording(false);
        cleanup();
    }, [cleanup]);

    const startRecording = useCallback(async () => {
        // Singleton: stop any other active recorder
        if (_activeRecorderId && _activeRecorderId !== idRef.current) {
            // Another instance is recording — block this one
            setError("Another recording is in progress");
            return;
        }

        setError(null);
        chunksRef.current = [];

        let stream: MediaStream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch {
            setError("Microphone access denied");
            return;
        }

        streamRef.current = stream;
        _activeRecorderId = idRef.current;

        // ── Web Audio analyser for volume bars ──
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        // ── MediaRecorder ──
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType });
        recorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
            // Cleanup timers and stream
            if (silenceTimerRef.current) clearInterval(silenceTimerRef.current);
            if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
            stream.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
            if (_activeRecorderId === idRef.current) _activeRecorderId = null;
            setVolumeLevels([0, 0, 0, 0, 0]);
            setIsRecording(false);

            if (chunksRef.current.length > 0) {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                chunksRef.current = [];
                await uploadAndTranscribe(blob);
            }
        };

        recorder.start(250); // collect chunks every 250ms
        setIsRecording(true);
        lastSpeechRef.current = Date.now();

        // ── Volume animation loop ──
        const sampleVolume = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            // Sample 5 frequency bands
            const bands = 5;
            const step = Math.floor(dataArray.length / bands);
            const levels = Array.from({ length: bands }, (_, i) => {
                const val = dataArray[i * step] / 255;
                return Math.max(0.08, val); // minimum bar height
            });
            setVolumeLevels(levels);
            animFrameRef.current = requestAnimationFrame(sampleVolume);
        };
        sampleVolume();

        // ── Silence detection ──
        silenceTimerRef.current = setInterval(() => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            if (avg > 4) {
                lastSpeechRef.current = Date.now();
            } else if (Date.now() - lastSpeechRef.current > silenceMs) {
                stopRecording();
            }
        }, 200);

        // ── Hard max duration ──
        maxTimerRef.current = setTimeout(() => {
            stopRecording();
        }, maxDurationMs);
    }, [maxDurationMs, silenceMs, stopRecording, uploadAndTranscribe, cleanup]);

    return {
        isRecording,
        isTranscribing,
        error,
        volumeLevels,
        startRecording,
        stopRecording,
        cancelRecording,
    };
}

// ── Transcript merge helper ──
export function mergeTranscript(
    existing: string,
    incoming: string,
    mode: TranscriptMode
): string {
    switch (mode) {
        case "replace":
            return incoming;
        case "append-inline":
            return existing ? `${existing} ${incoming}` : incoming;
        case "append-block":
            return existing ? `${existing}\n${incoming}` : incoming;
        case "submit":
            return incoming; // caller handles send
        default:
            return incoming;
    }
}
