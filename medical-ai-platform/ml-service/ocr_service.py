"""
Medical OCR Service for VaidyaVision.
Extracts text from medical prescriptions, reports, and handwritten notes.
Google Cloud Vision API (primary) + multi-pass Tesseract (fallback).
"""

import os
import re
import io
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

try:
    from google.cloud import vision
    HAS_GOOGLE_VISION = True
except ImportError:
    HAS_GOOGLE_VISION = False

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "")


class MedicalOCR:
    """
    Medical document OCR engine with multi-pass extraction.
    Runs multiple preprocessing pipelines + PSM modes and picks the best result.
    """

    def __init__(self):
        self.available_methods = []
        self.vision_client = None

        # Google Vision API — primary engine for handwritten + printed
        if HAS_GOOGLE_VISION and GOOGLE_API_KEY:
            try:
                from google.cloud import vision
                self.vision_client = vision.ImageAnnotatorClient(
                    client_options={"api_key": GOOGLE_API_KEY}
                )
                self.available_methods.append("google_vision")
                logger.info("Google Cloud Vision API initialized with API key.")
            except Exception as e:
                logger.warning(f"Failed to init Google Vision: {e}")

        if HAS_TESSERACT:
            self.available_methods.append("tesseract")

        if not self.available_methods:
            logger.warning("No OCR engines available.")
        logger.info(f"OCR engine initialized. Methods={self.available_methods}, CV2={'yes' if HAS_CV2 else 'no'}")

    # ── Preprocessing pipelines ──────────────────────────────────

    def _upscale(self, img: np.ndarray, target_width: int = 2000) -> np.ndarray:
        """Upscale small images for better OCR."""
        h, w = img.shape[:2]
        if w < target_width:
            scale = target_width / w
            img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        return img

    def _deskew(self, img: np.ndarray) -> np.ndarray:
        """Deskew a grayscale image using projection profile."""
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
            return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
        except Exception:
            return img

    def _remove_noise(self, img: np.ndarray) -> np.ndarray:
        """Remove noise with morphological operations."""
        kernel = np.ones((1, 1), np.uint8)
        img = cv2.dilate(img, kernel, iterations=1)
        img = cv2.erode(img, kernel, iterations=1)
        img = cv2.morphologyEx(img, cv2.MORPH_CLOSE, kernel)
        return cv2.medianBlur(img, 3)

    def _preprocess_adaptive(self, img: np.ndarray) -> np.ndarray:
        """Adaptive thresholding pipeline — best for printed text on uneven backgrounds."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        gray = self._upscale(gray)
        gray = self._deskew(gray)
        # CLAHE for contrast normalization
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        # Adaptive threshold
        binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 15)
        binary = self._remove_noise(binary)
        return binary

    def _preprocess_otsu(self, img: np.ndarray) -> np.ndarray:
        """Otsu binarization pipeline — good for high-contrast documents."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        gray = self._upscale(gray)
        gray = self._deskew(gray)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        binary = self._remove_noise(binary)
        return binary

    def _preprocess_sharpen(self, img: np.ndarray) -> np.ndarray:
        """Heavy sharpen + contrast boost — good for faded/handwritten text."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        gray = self._upscale(gray)
        gray = self._deskew(gray)
        # Unsharp mask
        blur = cv2.GaussianBlur(gray, (0, 0), 3)
        sharp = cv2.addWeighted(gray, 2.0, blur, -1.0, 0)
        # Aggressive contrast
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
        sharp = clahe.apply(sharp)
        _, binary = cv2.threshold(sharp, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary

    def _preprocess_invert_check(self, img: np.ndarray) -> np.ndarray:
        """Check if image is inverted (white text on dark bg) and fix."""
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
        gray = self._upscale(gray)
        # If most pixels are dark, invert
        if np.mean(gray) < 127:
            gray = cv2.bitwise_not(gray)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary

    def _pil_preprocess(self, image: Image.Image) -> Image.Image:
        """Fallback PIL-only preprocessing when cv2 is not available."""
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
        img = img.point(lambda x: 0 if x < 140 else 255, '1')
        return img.convert("L")

    # ── Tesseract multi-pass extraction ──────────────────────────

    def _run_tesseract(self, image, config: str = "--oem 3 --psm 6") -> Tuple[str, float]:
        """Run tesseract and return (text, confidence)."""
        try:
            data = pytesseract.image_to_data(image, config=config, output_type=pytesseract.Output.DICT)
            confidences = [int(c) for c in data["conf"] if int(c) > 0]
            avg_conf = sum(confidences) / len(confidences) / 100.0 if confidences else 0.0
            text = pytesseract.image_to_string(image, config=config).strip()
            return text, round(avg_conf, 4)
        except Exception as e:
            logger.error(f"Tesseract error with config '{config}': {e}")
            return "", 0.0

    def _score_text(self, text: str) -> float:
        """Score extracted text quality — higher is better."""
        if not text.strip():
            return 0.0

        words = text.split()
        num_words = len(words)
        if num_words == 0:
            return 0.0

        # Ratio of alphabetic words (real words vs garbage like "@@##")
        alpha_words = sum(1 for w in words if any(c.isalpha() for c in w))
        alpha_ratio = alpha_words / num_words

        # Average word length (real text: 3-10 chars; garbage: 1-2 or 15+)
        avg_len = sum(len(w) for w in words) / num_words
        len_score = 1.0 if 3 <= avg_len <= 12 else 0.5

        # Ratio of common English/medical characters vs symbols
        clean_chars = sum(1 for c in text if c.isalnum() or c in ' .,;:-/()\n')
        char_ratio = clean_chars / len(text) if text else 0.0

        # Line count bonus (real documents have multiple lines)
        lines = [l for l in text.split('\n') if l.strip()]
        line_bonus = min(len(lines) / 5.0, 1.0)

        # Total word count bonus (more words = likely better extraction)
        word_bonus = min(num_words / 20.0, 1.0)

        score = (alpha_ratio * 0.3 + char_ratio * 0.25 + len_score * 0.15 +
                 line_bonus * 0.15 + word_bonus * 0.15)
        return round(score, 4)

    def _multi_pass_extract(self, image_bytes: bytes) -> dict:
        """
        Run multiple preprocessing + PSM combinations and pick the best result.
        """
        image = Image.open(io.BytesIO(image_bytes))
        img_np = np.array(image) if HAS_CV2 else None

        # Define passes: (name, preprocessed_image, tesseract_config)
        passes: List[Tuple[str, any, str]] = []

        # PSM modes to try:
        # 3 = Fully automatic page segmentation (default)
        # 4 = Assume single column of variable-size text
        # 6 = Assume single uniform block of text
        # 11 = Sparse text — find as much text as possible
        # 12 = Sparse text with OSD
        psm_modes = ["--oem 3 --psm 3", "--oem 3 --psm 4", "--oem 3 --psm 6", "--oem 3 --psm 11"]

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
                    for psm_config in psm_modes:
                        passes.append((f"{prep_name}+{psm_config}", pil_img, psm_config))
                except Exception as e:
                    logger.warning(f"Preprocessing '{prep_name}' failed: {e}")
        else:
            # PIL-only fallback
            processed = self._pil_preprocess(image)
            for psm_config in psm_modes:
                passes.append((f"pil+{psm_config}", processed, psm_config))

        # Also try raw image with different PSMs
        for psm_config in psm_modes:
            passes.append((f"raw+{psm_config}", image, psm_config))

        # Run all passes and score them
        best_text = ""
        best_conf = 0.0
        best_score = 0.0
        best_method = "tesseract"
        all_results = []

        for name, img, config in passes:
            text, conf = self._run_tesseract(img, config)
            quality = self._score_text(text)
            combined = conf * 0.4 + quality * 0.6  # Weight quality more than raw confidence
            all_results.append((name, text, conf, quality, combined))

            if combined > best_score:
                best_score = combined
                best_text = text
                best_conf = conf
                best_method = f"tesseract_{name}"

        logger.info(f"Multi-pass OCR: {len(passes)} passes, best={best_method} score={best_score:.3f} conf={best_conf:.3f}")

        # Log top 3 for debugging
        all_results.sort(key=lambda x: x[4], reverse=True)
        for name, _, conf, quality, combined in all_results[:3]:
            logger.info(f"  Top pass: {name} conf={conf:.3f} quality={quality:.3f} combined={combined:.3f}")

        return {
            "raw_text": best_text,
            "confidence": best_conf,
            "method_used": best_method,
            "quality_score": best_score,
            "passes_run": len(passes),
        }

    # ── Google Vision API extraction ─────────────────────────────

    def _extract_google_vision(self, image_bytes: bytes) -> dict:
        """Extract text using Google Cloud Vision API (handles handwriting + print)."""
        if not self.vision_client:
            return {"raw_text": "", "confidence": 0.0, "method_used": "google_vision", "error": "Vision client not initialized"}

        try:
            from google.cloud import vision
            image = vision.Image(content=image_bytes)

            # Use DOCUMENT_TEXT_DETECTION for best accuracy on documents
            response = self.vision_client.document_text_detection(image=image)

            if response.error.message:
                return {
                    "raw_text": "",
                    "confidence": 0.0,
                    "method_used": "google_vision",
                    "error": response.error.message,
                }

            full_text = response.full_text_annotation.text if response.full_text_annotation else ""

            # Calculate average confidence from pages/blocks/paragraphs/words
            confidences = []
            if response.full_text_annotation:
                for page in response.full_text_annotation.pages:
                    for block in page.blocks:
                        confidences.append(block.confidence)

            avg_conf = sum(confidences) / len(confidences) if confidences else 0.85  # Vision is generally high-conf

            return {
                "raw_text": full_text.strip(),
                "confidence": round(avg_conf, 4),
                "method_used": "google_vision",
            }
        except Exception as e:
            logger.error(f"Google Vision API error: {e}")
            return {"raw_text": "", "confidence": 0.0, "method_used": "google_vision", "error": str(e)}

    # ── Document type detection ────────────────────────────────

    def detect_document_type(self, text: str) -> str:
        """Detect the type of medical document from extracted text."""
        text_lower = text.lower()

        prescription_keywords = [
            "rx", "prescription", "dispense", "tablet", "capsule", "mg",
            "dose", "twice daily", "once daily", "before meals", "after meals",
            "sig:", "refill", "tab", "cap", "syrup", "inj", "ointment",
            "o.d.", "b.d.", "t.d.s.", "q.d.", "b.i.d.", "t.i.d.",
            "prn", "stat", "p.o.", "i.v.", "i.m.",
        ]
        report_keywords = [
            "report", "findings", "impression", "diagnosis",
            "laboratory", "pathology", "radiology", "investigation",
            "result", "normal range", "reference range", "specimen",
            "blood", "urine", "serum", "plasma",
        ]
        discharge_keywords = [
            "discharge summary", "admitted", "discharged", "hospital",
            "course in hospital", "condition at discharge",
        ]

        prescription_score = sum(1 for kw in prescription_keywords if kw in text_lower)
        report_score = sum(1 for kw in report_keywords if kw in text_lower)
        discharge_score = sum(1 for kw in discharge_keywords if kw in text_lower)

        scores = {
            "prescription": prescription_score,
            "lab_report": report_score,
            "discharge_summary": discharge_score,
        }
        doc_type = max(scores, key=scores.get)
        return doc_type if scores[doc_type] >= 2 else "medical_document"

    # ── Public API ───────────────────────────────────────────────

    def extract_text(self, image_bytes: bytes, method: str = "auto") -> dict:
        """
        Extract text from a medical document image.
        Strategy: Google Vision API first (best for handwriting + printed),
        falls back to multi-pass Tesseract if Vision is unavailable.
        """
        if not self.available_methods:
            return {
                "raw_text": "",
                "confidence": 0.0,
                "method_used": "none",
                "document_type": "unknown",
                "error": "No OCR engines available.",
            }

        result = None

        # Try Google Vision first (handles handwriting far better)
        if "google_vision" in self.available_methods and method in ("auto", "google_vision"):
            result = self._extract_google_vision(image_bytes)
            if result.get("error") or not result.get("raw_text", "").strip():
                logger.warning(f"Google Vision failed or empty, falling back to Tesseract. Error: {result.get('error')}")
                result = None

        # Fallback to multi-pass Tesseract
        if result is None and "tesseract" in self.available_methods:
            result = self._multi_pass_extract(image_bytes)

        if result is None:
            return {"raw_text": "", "confidence": 0.0, "method_used": "none", "document_type": "unknown", "error": "All OCR methods failed"}

        if result["raw_text"].strip():
            result["document_type"] = self.detect_document_type(result["raw_text"])
        else:
            result["document_type"] = "unknown"

        return result

    def extract_from_pdf(self, pdf_bytes: bytes) -> dict:
        """Extract text from a PDF document."""
        if not HAS_PDF2IMAGE:
            return {
                "raw_text": "",
                "confidence": 0.0,
                "method_used": "pdf",
                "document_type": "unknown",
                "error": "pdf2image not installed. pip install pdf2image",
            }

        try:
            images = convert_from_bytes(pdf_bytes, dpi=300)
            all_text = []
            total_confidence = 0.0

            for i, page_image in enumerate(images):
                # Convert page to bytes and use multi-pass extraction
                buf = io.BytesIO()
                page_image.save(buf, format="PNG")
                result = self._multi_pass_extract(buf.getvalue())
                page_text = result.get("raw_text", "")
                if page_text:
                    all_text.append(f"--- Page {i + 1} ---\n{page_text}")
                    total_confidence += result.get("confidence", 0.0)

            combined_text = "\n\n".join(all_text)
            avg_conf = total_confidence / len(images) if images else 0.0

            return {
                "raw_text": combined_text,
                "confidence": round(avg_conf, 4),
                "method_used": "tesseract_pdf",
                "document_type": self.detect_document_type(combined_text) if combined_text else "unknown",
                "page_count": len(images),
            }
        except Exception as e:
            logger.error(f"PDF OCR error: {e}")
            return {"raw_text": "", "confidence": 0.0, "method_used": "pdf", "error": str(e)}

    def extract_prescriptions_only(self, text: str) -> dict:
        """
        Extract only medication/prescription info from OCR text using regex patterns.
        Returns structured medication list.
        """
        medications = []

        # Common medication patterns
        # Pattern: Drug Name Dose Frequency Duration
        med_pattern = re.compile(
            r"(?:tab|cap|syrup|inj|ointment|cream|drops|gel|spray|inhaler)[\s.]*"
            r"([A-Za-z\s\-]+?)"
            r"\s*(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|iu|units)?)"
            r"(?:\s*[-–]\s*(.+?))?$",
            re.IGNORECASE | re.MULTILINE,
        )

        for match in med_pattern.finditer(text):
            drug = match.group(1).strip()
            dose = match.group(2).strip()
            instructions = match.group(3).strip() if match.group(3) else ""
            if drug and len(drug) > 1:
                medications.append({
                    "drug_name": drug,
                    "dosage": dose,
                    "instructions": instructions,
                })

        # Also try simpler line-by-line extraction
        if not medications:
            lines = text.split("\n")
            dose_words = {"mg", "mcg", "ml", "tablet", "cap", "tab", "syrup", "od", "bd", "tds"}
            for line in lines:
                line = line.strip()
                if not line or len(line) < 5:
                    continue
                words = line.lower().split()
                if any(dw in words or any(dw in w for w in words) for dw in dose_words):
                    medications.append({
                        "drug_name": line,
                        "dosage": "",
                        "instructions": "",
                    })

        return {
            "medications": medications,
            "count": len(medications),
        }
