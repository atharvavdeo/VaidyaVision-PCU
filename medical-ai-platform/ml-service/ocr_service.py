"""
Medical OCR Service for VaidyaVision.
Extracts text from medical prescriptions, reports, and handwritten notes.
Mindee (primary) + multi-pass Tesseract (fallback).
"""

import os
import re
import io
import tempfile
import logging
import numpy as np
from typing import Optional, List, Tuple
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

try:
    import cv2
    HAS_CV2 = True
except ImportError:
    HAS_CV2 = False

try:
    import pytesseract
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False

try:
    from pdf2image import convert_from_bytes
    HAS_PDF2IMAGE = True
except ImportError:
    HAS_PDF2IMAGE = False

# Mindee SDK imports
try:
    from mindee import ClientV2, OCRParameters, OCRResponse
    HAS_MINDEE = True
except ImportError:
    HAS_MINDEE = False

logger = logging.getLogger(__name__)

# ── Environment-driven configuration ────────────────────────────
# Required env vars:
#   MINDEE_API_KEY    — your Mindee API key (never commit this)
#   MINDEE_MODEL_ID   — defaults to the VaidyaVision OCR model
MINDEE_API_KEY = os.environ.get("MINDEE_API_KEY", "")
MINDEE_MODEL_ID = os.environ.get("MINDEE_MODEL_ID", "3dd51448-892f-43c9-94ec-4cfa752e1601")


class MedicalOCR:
    """
    Medical document OCR engine.
    Primary: Mindee API (via official SDK).
    Fallback: multi-pass Tesseract with preprocessing pipelines.
    """

    def __init__(self):
        self.available_methods: List[str] = []
        self.mindee_client = None

        # ── Mindee initialisation ──
        if HAS_MINDEE and MINDEE_API_KEY:
            try:
                self.mindee_client = ClientV2(api_key=MINDEE_API_KEY)
                self.available_methods.append("mindee")
                logger.info("Mindee OCR client initialised (model_id=%s).", MINDEE_MODEL_ID)
            except Exception as e:
                logger.warning("Failed to initialise Mindee client: %s", e)
        elif not MINDEE_API_KEY:
            logger.warning("MINDEE_API_KEY not set – Mindee OCR will be unavailable.")
        elif not HAS_MINDEE:
            logger.warning("mindee SDK not installed – Mindee OCR will be unavailable.")

        # ── Tesseract fallback ──
        if HAS_TESSERACT:
            self.available_methods.append("tesseract")

        if not self.available_methods:
            logger.warning("No OCR engines available.")

        logger.info(
            "OCR engine ready. methods=%s, cv2=%s",
            self.available_methods,
            "yes" if HAS_CV2 else "no",
        )

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #  MINDEE PRIMARY EXTRACTION
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    def _extract_mindee(self, image_bytes: bytes) -> dict:
        """
        Send image to Mindee OCR API via a safe temp-file flow.
        Returns dict with keys: text, method, confidence.
        """
        if not self.mindee_client:
            return {"text": "", "method": "mindee", "confidence": 0.0,
                    "error": "Mindee client not initialised"}

        # Write bytes to a temp file (Mindee SDK needs a file path)
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".png")
        try:
            with os.fdopen(tmp_fd, "wb") as f:
                f.write(image_bytes)

            source = self.mindee_client.source_from_path(tmp_path)
            params = OCRParameters(model_id=MINDEE_MODEL_ID)
            result = self.mindee_client.enqueue_and_get_result(
                OCRResponse, source, params,
            )

            # Extract text from pages
            pages_text: List[str] = []
            inference_result = result.inference.result if result.inference else None

            if inference_result and hasattr(inference_result, "pages"):
                for page in inference_result.pages:
                    if hasattr(page, "content") and page.content:
                        pages_text.append(str(page.content))
                    elif hasattr(page, "words") and page.words:
                        # Compose from individual word objects
                        pages_text.append(
                            " ".join(w.content for w in page.words if hasattr(w, "content"))
                        )

            full_text = "\n\n".join(pages_text).strip()

            if not full_text:
                return {"text": "", "method": "mindee", "confidence": 0.0,
                        "error": "Mindee returned empty text"}

            return {
                "text": full_text,
                "method": "mindee",
                "confidence": 0.95,   # Mindee doesn't expose per-word conf yet
            }

        except Exception as e:
            logger.error("Mindee OCR failed: %s", e, exc_info=True)
            return {"text": "", "method": "mindee", "confidence": 0.0,
                    "error": str(e)}
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #  TESSERACT FALLBACK – MULTI-PASS
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    # ── Preprocessing pipelines (cv2) ──

    def _upscale(self, img: np.ndarray, target_width: int = 2000) -> np.ndarray:
        h, w = img.shape[:2]
        if w < target_width:
            scale = target_width / w
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        return img

    def _deskew(self, img: np.ndarray) -> np.ndarray:
        try:
            coords = np.column_stack(np.where(img < 128))
            if len(coords) < 50:
                return img
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = -(90 + angle)
            else:
                angle = -angle
            if abs(angle) < 0.5 or abs(angle) > 15:
                return img
            h, w = img.shape[:2]
            M = cv2.getRotationMatrix2D((w // 2, h // 2), angle, 1.0)
            return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC,
                                  borderMode=cv2.BORDER_REPLICATE)
        except Exception:
            return img

    def _remove_noise(self, img: np.ndarray) -> np.ndarray:
        kernel = np.ones((1, 1), np.uint8)
        img = cv2.dilate(img, kernel, iterations=1)
        img = cv2.erode(img, kernel, iterations=1)
        img = cv2.morphologyEx(img, cv2.MORPH_CLOSE, kernel)
        return cv2.medianBlur(img, 3)

    def _preprocess_adaptive(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        gray = self._upscale(gray)
        gray = self._deskew(gray)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                                       cv2.THRESH_BINARY, 31, 15)
        return self._remove_noise(binary)

    def _preprocess_otsu(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        gray = self._upscale(gray)
        gray = self._deskew(gray)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return self._remove_noise(binary)

    def _preprocess_sharpen(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        gray = self._upscale(gray)
        gray = self._deskew(gray)
        blur = cv2.GaussianBlur(gray, (0, 0), 3)
        sharp = cv2.addWeighted(gray, 2.0, blur, -1.0, 0)
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
        sharp = clahe.apply(sharp)
        _, binary = cv2.threshold(sharp, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary

    def _preprocess_invert_check(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        gray = self._upscale(gray)
        if np.mean(gray) < 127:
            gray = cv2.bitwise_not(gray)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary

    def _pil_preprocess(self, image: Image.Image) -> Image.Image:
        img = image.convert("L")
        w, h = img.size
        if w < 1500:
            scale = 1500 / w
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        img = ImageOps.autocontrast(img, cutoff=2)
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(2.0)
        img = img.point(lambda x: 0 if x < 140 else 255, "1")
        return img.convert("L")

    # ── Tesseract helpers ──

    def _run_tesseract(self, image, config: str = "--oem 3 --psm 6") -> Tuple[str, float]:
        try:
            data = pytesseract.image_to_data(image, config=config,
                                              output_type=pytesseract.Output.DICT)
            confidences = [int(c) for c in data["conf"] if int(c) > 0]
            avg_conf = sum(confidences) / len(confidences) / 100.0 if confidences else 0.0
            text = pytesseract.image_to_string(image, config=config).strip()
            return text, round(avg_conf, 4)
        except Exception as e:
            logger.error("Tesseract error (%s): %s", config, e)
            return "", 0.0

    def _score_text(self, text: str) -> float:
        if not text.strip():
            return 0.0
        words = text.split()
        num_words = len(words)
        if num_words == 0:
            return 0.0
        alpha_words = sum(1 for w in words if any(c.isalpha() for c in w))
        alpha_ratio = alpha_words / num_words
        avg_len = sum(len(w) for w in words) / num_words
        len_score = 1.0 if 3 <= avg_len <= 12 else 0.5
        clean_chars = sum(1 for c in text if c.isalnum() or c in " .,;:-/()\n")
        char_ratio = clean_chars / len(text) if text else 0.0
        lines = [ln for ln in text.split("\n") if ln.strip()]
        line_bonus = min(len(lines) / 5.0, 1.0)
        word_bonus = min(num_words / 20.0, 1.0)
        return round(
            alpha_ratio * 0.3 + char_ratio * 0.25 + len_score * 0.15 +
            line_bonus * 0.15 + word_bonus * 0.15, 4,
        )

    def _multi_pass_extract(self, image_bytes: bytes) -> dict:
        """Run multiple preprocessing + PSM combos and pick the best result."""
        image = Image.open(io.BytesIO(image_bytes))
        img_np = np.array(image) if HAS_CV2 else None

        passes: List[Tuple[str, any, str]] = []
        psm_modes = [
            "--oem 3 --psm 3", "--oem 3 --psm 4",
            "--oem 3 --psm 6", "--oem 3 --psm 11",
        ]

        if HAS_CV2 and img_np is not None:
            preprocessors = [
                ("adaptive", self._preprocess_adaptive),
                ("otsu", self._preprocess_otsu),
                ("sharpen", self._preprocess_sharpen),
                ("invert_check", self._preprocess_invert_check),
            ]
            for prep_name, prep_fn in preprocessors:
                try:
                    processed = prep_fn(img_np)
                    pil_img = Image.fromarray(processed)
                    for psm in psm_modes:
                        passes.append((f"{prep_name}+{psm}", pil_img, psm))
                except Exception as e:
                    logger.warning("Preprocessing '%s' failed: %s", prep_name, e)
        else:
            processed = self._pil_preprocess(image)
            for psm in psm_modes:
                passes.append((f"pil+{psm}", processed, psm))

        # Also try the raw image
        for psm in psm_modes:
            passes.append((f"raw+{psm}", image, psm))

        best_text, best_conf, best_score = "", 0.0, 0.0
        for name, img, config in passes:
            text, conf = self._run_tesseract(img, config)
            quality = self._score_text(text)
            combined = conf * 0.4 + quality * 0.6
            if combined > best_score:
                best_score = combined
                best_text = text
                best_conf = conf

        logger.info("Tesseract fallback: %d passes, best_score=%.3f", len(passes), best_score)
        return {
            "text": best_text,
            "confidence": best_conf,
            "method": "pytesseract",
        }

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #  DOCUMENT TYPE DETECTION
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    def detect_document_type(self, text: str) -> str:
        text_lower = text.lower()

        prescription_kw = [
            "rx", "prescription", "dispense", "tablet", "capsule", "mg",
            "dose", "twice daily", "once daily", "before meals", "after meals",
            "sig:", "refill", "tab", "cap", "syrup", "inj", "ointment",
            "o.d.", "b.d.", "t.d.s.", "q.d.", "b.i.d.", "t.i.d.",
            "prn", "stat", "p.o.", "i.v.", "i.m.",
        ]
        report_kw = [
            "report", "findings", "impression", "diagnosis",
            "laboratory", "pathology", "radiology", "investigation",
            "result", "normal range", "reference range", "specimen",
            "blood", "urine", "serum", "plasma",
        ]
        discharge_kw = [
            "discharge summary", "admitted", "discharged", "hospital",
            "course in hospital", "condition at discharge",
        ]

        scores = {
            "prescription": sum(1 for kw in prescription_kw if kw in text_lower),
            "lab_report": sum(1 for kw in report_kw if kw in text_lower),
            "discharge_summary": sum(1 for kw in discharge_kw if kw in text_lower),
        }
        doc_type = max(scores, key=scores.get)
        return doc_type if scores[doc_type] >= 2 else "medical_document"

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    #  PUBLIC API
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    def extract_text(self, image_bytes: bytes, method: str = "auto") -> dict:
        """
        Extract text from a medical document image.

        Provider order:
          1. Mindee (primary)
          2. pytesseract (fallback)

        Returns:
            dict with keys: text, method, confidence, document_type
            Optionally: error (if both fail)
        """
        if not self.available_methods:
            return {
                "text": "", "confidence": 0.0, "method": "none",
                "document_type": "unknown",
                "error": "No OCR engines available. Set MINDEE_API_KEY or install pytesseract.",
            }

        result = None

        # ── 1. Mindee primary ──
        if "mindee" in self.available_methods and method in ("auto", "mindee"):
            result = self._extract_mindee(image_bytes)
            if result.get("error") or not result.get("text", "").strip():
                logger.warning(
                    "Mindee failed or returned empty, falling back to pytesseract. reason=%s",
                    result.get("error"),
                )
                result = None  # trigger fallback

        # ── 2. pytesseract fallback ──
        if result is None and "tesseract" in self.available_methods:
            result = self._multi_pass_extract(image_bytes)
            if not result.get("text", "").strip():
                result = None

        # ── both failed ──
        if result is None:
            return {
                "text": "", "confidence": 0.0, "method": "none",
                "document_type": "unknown",
                "error": "All OCR methods failed.",
            }

        # Annotate document type
        extracted = result.get("text", "")
        result["document_type"] = (
            self.detect_document_type(extracted) if extracted.strip() else "unknown"
        )
        # Keep raw_text alias for downstream compat
        result["raw_text"] = extracted
        return result

    # ── PDF helper ──

    def extract_from_pdf(self, pdf_bytes: bytes) -> dict:
        if not HAS_PDF2IMAGE:
            return {
                "text": "", "raw_text": "", "confidence": 0.0,
                "method": "pdf", "document_type": "unknown",
                "error": "pdf2image not installed.",
            }
        try:
            images = convert_from_bytes(pdf_bytes, dpi=300)
            all_text, total_conf = [], 0.0
            for i, page_img in enumerate(images):
                buf = io.BytesIO()
                page_img.save(buf, format="PNG")
                res = self.extract_text(buf.getvalue())
                page_text = res.get("text", "")
                if page_text:
                    all_text.append(f"--- Page {i + 1} ---\n{page_text}")
                    total_conf += res.get("confidence", 0.0)
            combined = "\n\n".join(all_text)
            avg_conf = total_conf / len(images) if images else 0.0
            return {
                "text": combined, "raw_text": combined,
                "confidence": round(avg_conf, 4),
                "method": "pdf_multipage",
                "document_type": self.detect_document_type(combined) if combined else "unknown",
                "page_count": len(images),
            }
        except Exception as e:
            logger.error("PDF OCR error: %s", e)
            return {"text": "", "raw_text": "", "confidence": 0.0,
                    "method": "pdf", "error": str(e)}

    # ── Prescription regex extractor ──

    def extract_prescriptions_only(self, text: str) -> dict:
        medications = []
        med_pattern = re.compile(
            r"(?:tab|cap|syrup|inj|ointment|cream|drops|gel|spray|inhaler)[\s.]*"
            r"([A-Za-z\s\-]+?)"
            r"\s*(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|iu|units)?)"
            r"(?:\s*[-–]\s*(.+?))?$",
            re.IGNORECASE | re.MULTILINE,
        )
        for m in med_pattern.finditer(text):
            drug = m.group(1).strip()
            dose = m.group(2).strip()
            instr = m.group(3).strip() if m.group(3) else ""
            if drug and len(drug) > 1:
                medications.append({"drug_name": drug, "dosage": dose, "instructions": instr})

        if not medications:
            dose_words = {"mg", "mcg", "ml", "tablet", "cap", "tab", "syrup", "od", "bd", "tds"}
            for line in text.split("\n"):
                line = line.strip()
                if not line or len(line) < 5:
                    continue
                words = line.lower().split()
                if any(dw in words or any(dw in w for w in words) for dw in dose_words):
                    medications.append({"drug_name": line, "dosage": "", "instructions": ""})

        return {"medications": medications, "count": len(medications)}
