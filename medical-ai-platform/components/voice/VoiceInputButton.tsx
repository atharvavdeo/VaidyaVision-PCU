"use client";

import React from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { useVoiceInput, mergeTranscript, TranscriptMode } from "./useVoiceInput";

interface VoiceInputButtonProps {
    /** Called with the final transcript text. For "submit" mode the raw text is passed. */
    onTranscript: (text: string) => void;
    /** How to merge the transcript with existing field content */
    mode?: TranscriptMode;
    /** Current value of the field (needed for append modes) */
    currentValue?: string;
    /** Setter for the field value (not needed for submit mode) */
    onValueChange?: (value: string) => void;
    /** Whether the button is disabled */
    disabled?: boolean;
    /** Language hint */
    language?: string;
    /** Tooltip */
    title?: string;
    /** Max recording duration in ms */
    maxDurationMs?: number;
    /** Silence timeout in ms */
    silenceMs?: number;
    /** Extra className */
    className?: string;
    /** Compact variant for inline inputs */
    compact?: boolean;
}

export default function VoiceInputButton({
    onTranscript,
    mode = "replace",
    currentValue = "",
    onValueChange,
    disabled = false,
    language,
    title = "Dictate",
    maxDurationMs,
    silenceMs,
    className = "",
    compact = false,
}: VoiceInputButtonProps) {
    const handleTranscript = React.useCallback(
        (text: string) => {
            if (mode === "submit") {
                onTranscript(text);
            } else {
                const merged = mergeTranscript(currentValue, text, mode);
                if (onValueChange) onValueChange(merged);
                onTranscript(text);
            }
        },
        [onTranscript, mode, currentValue, onValueChange]
    );

    const {
        isRecording,
        isTranscribing,
        error,
        volumeLevels,
        startRecording,
        stopRecording,
    } = useVoiceInput(handleTranscript, { maxDurationMs, silenceMs, language });

    const handleClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    const btnSize = compact ? "w-7 h-7" : "w-8 h-8";
    const iconSize = compact ? "w-3.5 h-3.5" : "w-4 h-4";

    return (
        <div className={`inline-flex items-center gap-1 ${className}`}>
            {/* Volume wave bars — visible during recording */}
            {isRecording && (
                <div className="flex items-end gap-[2px] h-5 mr-0.5">
                    {volumeLevels.map((level, i) => (
                        <div
                            key={i}
                            className="w-[3px] rounded-full bg-emerald-500 transition-all duration-75"
                            style={{
                                height: `${Math.max(4, level * 20)}px`,
                                opacity: 0.7 + level * 0.3,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Transcribing pulse */}
            {isTranscribing && (
                <div className="flex items-end gap-[2px] h-5 mr-0.5">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <div
                            key={i}
                            className="w-[3px] rounded-full bg-olive-400 animate-pulse"
                            style={{
                                height: `${6 + (i % 3) * 4}px`,
                                animationDelay: `${i * 100}ms`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Mic button */}
            <button
                type="button"
                onClick={handleClick}
                disabled={disabled || isTranscribing}
                title={error || (isRecording ? "Stop recording" : isTranscribing ? "Transcribing…" : title)}
                className={`
                    ${btnSize} flex items-center justify-center rounded-lg
                    transition-all duration-200 flex-shrink-0
                    ${disabled || isTranscribing
                        ? "opacity-40 cursor-not-allowed"
                        : isRecording
                            ? "bg-red-100 text-red-600 border border-red-300 hover:bg-red-200 shadow-sm"
                            : error
                                ? "bg-cream-100 text-red-500 border border-red-200 hover:bg-red-50"
                                : "bg-cream-100 text-olive-600 border border-sage-300 hover:bg-sage-100 hover:text-olive-800"
                    }
                `}
            >
                {isTranscribing ? (
                    <Loader2 className={`${iconSize} animate-spin`} />
                ) : isRecording ? (
                    <MicOff className={iconSize} />
                ) : (
                    <Mic className={iconSize} />
                )}
            </button>

            {/* Inline error hint */}
            {error && !isRecording && !isTranscribing && (
                <span className="text-[10px] text-red-500 max-w-[100px] truncate" title={error}>
                    {error}
                </span>
            )}
        </div>
    );
}
