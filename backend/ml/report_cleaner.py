"""
Medical Report Cleaner for VaidyaVision.
Uses Groq (LLaMA 3.3 70B) to clean, structure, and enhance OCR-extracted medical text.
"""

import os
import json
import logging
from typing import Optional

logger = logging.getLogger(__name__)

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def _build_cleaning_prompt(raw_text: str, document_type: str) -> str:
    """Build a specialized prompt based on document type."""

    base_instructions = """You are a medical document processing AI. Your task is to clean, correct, and structure OCR-extracted medical text.

RULES:
1. Fix OCR errors (common misreads: 0↔O, 1↔l↔I, rn↔m, cl↔d)
2. Correct medical terminology spelling
3. Preserve all drug names, dosages, and measurements EXACTLY
4. Maintain all numerical values without modification
5. Structure the output in valid JSON format
6. If information is unclear or ambiguous, mark it with [UNCLEAR]
7. Do NOT invent or hallucinate any medical information"""

    if document_type == "prescription":
        return f"""{base_instructions}

DOCUMENT TYPE: Medical Prescription

Extract and structure the following OCR text from a prescription:

---
{raw_text}
---

Return valid JSON with this structure:
{{
    "document_type": "prescription",
    "doctor_name": "...",
    "doctor_qualifications": "...",
    "clinic_name": "...",
    "patient_name": "...",
    "date": "...",
    "medications": [
        {{
            "drug_name": "...",
            "dosage": "...",
            "frequency": "...",
            "duration": "...",
            "instructions": "...",
            "form": "tablet/capsule/syrup/injection/etc"
        }}
    ],
    "diagnosis": "...",
    "special_instructions": "...",
    "follow_up": "...",
    "cleaned_text": "Full cleaned readable text"
}}"""

    elif document_type == "lab_report":
        return f"""{base_instructions}

DOCUMENT TYPE: Laboratory / Diagnostic Report

Extract and structure the following OCR text from a lab report:

---
{raw_text}
---

Return valid JSON with this structure:
{{
    "document_type": "lab_report",
    "lab_name": "...",
    "patient_name": "...",
    "date": "...",
    "report_type": "...",
    "results": [
        {{
            "test_name": "...",
            "value": "...",
            "unit": "...",
            "reference_range": "...",
            "status": "normal/high/low/critical"
        }}
    ],
    "summary": "...",
    "doctor_notes": "...",
    "cleaned_text": "Full cleaned readable text"
}}"""

    elif document_type == "discharge_summary":
        return f"""{base_instructions}

DOCUMENT TYPE: Discharge Summary

Extract and structure the following OCR text from a discharge summary:

---
{raw_text}
---

Return valid JSON with this structure:
{{
    "document_type": "discharge_summary",
    "hospital_name": "...",
    "patient_name": "...",
    "admission_date": "...",
    "discharge_date": "...",
    "diagnosis": "...",
    "treatment_given": "...",
    "medications_at_discharge": [
        {{
            "drug_name": "...",
            "dosage": "...",
            "frequency": "...",
            "duration": "..."
        }}
    ],
    "follow_up_instructions": "...",
    "cleaned_text": "Full cleaned readable text"
}}"""

    else:
        return f"""{base_instructions}

DOCUMENT TYPE: General Medical Document

Clean and structure the following OCR text from a medical document:

---
{raw_text}
---

Return valid JSON with this structure:
{{
    "document_type": "medical_document",
    "content_type": "prescription/report/letter/other",
    "patient_name": "...",
    "date": "...",
    "key_information": {{
        "diagnoses": ["..."],
        "medications": ["..."],
        "findings": ["..."],
        "instructions": ["..."]
    }},
    "cleaned_text": "Full cleaned readable text"
}}"""


async def clean_and_structure(raw_text: str, document_type: str = "auto") -> dict:
    """
    Clean and structure OCR-extracted medical text using Groq LLM.

    Args:
        raw_text: Raw OCR text
        document_type: Document type or 'auto' to use as-is

    Returns:
        dict with structured data + cleaned text
    """
    if not GROQ_API_KEY:
        return {
            "error": "GROQ_API_KEY not set. Set it as an environment variable.",
            "raw_text": raw_text,
            "structured_data": None,
        }

    if not raw_text or len(raw_text.strip()) < 10:
        return {
            "error": "Insufficient text to process",
            "raw_text": raw_text,
            "structured_data": None,
        }

    prompt = _build_cleaning_prompt(raw_text, document_type)

    try:
        import httpx

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GROQ_API_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 4096,
                    "response_format": {"type": "json_object"},
                },
            )

            if response.status_code != 200:
                logger.error(f"Groq API error: {response.status_code} — {response.text}")
                return {
                    "error": f"Groq API returned {response.status_code}",
                    "raw_text": raw_text,
                    "structured_data": None,
                }

            data = response.json()
            content = data["choices"][0]["message"]["content"]
            structured = json.loads(content)

            return {
                "raw_text": raw_text,
                "structured_data": structured,
                "cleaned_text": structured.get("cleaned_text", raw_text),
                "document_type": structured.get("document_type", document_type),
                "model_used": GROQ_MODEL,
            }

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Groq response as JSON: {e}")
        return {
            "error": "Failed to parse structured output from LLM",
            "raw_text": raw_text,
            "structured_data": None,
        }
    except Exception as e:
        logger.error(f"Report cleaner error: {e}")
        return {
            "error": str(e),
            "raw_text": raw_text,
            "structured_data": None,
        }
