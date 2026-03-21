import os
import subprocess
import tempfile
import time

# Lazy load the model
_model = None

def get_model():
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        model_size = os.getenv("WHISPER_MODEL_SIZE", "small")
        device = os.getenv("WHISPER_DEVICE", "cpu")
        compute_type = os.getenv("WHISPER_COMPUTE_TYPE", "int8")
        print(f"[STT] Loading faster-whisper model '{model_size}' on {device}/{compute_type}...")
        _model = WhisperModel(model_size, device=device, compute_type=compute_type)
        print("[STT] Model loaded successfully.")
    return _model


def _convert_to_wav(input_path: str) -> str:
    """Convert any audio format to 16kHz mono WAV using ffmpeg."""
    wav_path = input_path.replace(".webm", ".wav")
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", input_path,
                "-ar", "16000",      # 16kHz sample rate
                "-ac", "1",          # mono
                "-f", "wav",
                wav_path
            ],
            capture_output=True,
            timeout=15
        )
        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace")
            print(f"[STT] ffmpeg conversion failed: {stderr[-500:]}")
            return input_path  # fallback to original
        return wav_path
    except Exception as e:
        print(f"[STT] ffmpeg error: {e}")
        return input_path


def transcribe_audio(audio_bytes: bytes) -> dict:
    start_time = time.time()

    if not audio_bytes or len(audio_bytes) < 100:
        return {"status": "error", "error": "Audio file too small or empty"}

    print(f"[STT] Received {len(audio_bytes)} bytes of audio")

    model = get_model()

    # Write raw browser audio to temp file
    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(audio_bytes)
        webm_path = tmp.name

    wav_path = None
    try:
        # Convert webm/opus to 16kHz mono WAV — fixes "Error parsing Opus packet header"
        wav_path = _convert_to_wav(webm_path)
        print(f"[STT] Transcribing from: {wav_path}")

        segments, info = model.transcribe(
            wav_path,
            beam_size=1,
            vad_filter=True,
            condition_on_previous_text=False
        )

        texts = []
        for segment in segments:
            texts.append(segment.text.strip())

        full_text = " ".join(texts)
        duration = time.time() - start_time

        print(f"[STT] Result: '{full_text[:80]}...' ({duration:.1f}s, lang={info.language})")

        return {
            "status": "success",
            "text": full_text,
            "provider": "faster-whisper",
            "model": os.getenv("WHISPER_MODEL_SIZE", "small"),
            "language": info.language,
            "confidence": round(info.language_probability, 3),
            "duration": round(duration, 2)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "status": "error",
            "error": str(e)
        }
    finally:
        for p in [webm_path, wav_path]:
            if p and os.path.exists(p):
                try:
                    os.remove(p)
                except:
                    pass
