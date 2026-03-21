"""
FastAPI server for VaidyaVision ML inference + Medical OCR.
Uses the real inference pipeline with GradCAM and MC Dropout.
Includes OCR extraction and Groq-powered report cleaning.
"""

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import os
import time
import base64
import traceback

from inference import load_models, predict as run_inference
from ocr_service import MedicalOCR
from report_cleaner import clean_and_structure
from research_crawler import crawler, get_rate_stats
from research_embeddings import index_articles, hybrid_search, get_index_stats
from research_rag import ask_research, get_research_stats, get_qa_history

app = FastAPI(title="VaidyaVision ML Service")

# Initialize OCR engine
ocr_engine = MedicalOCR()

# Allow all origins for hackathon
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure heatmap output directory exists
HEATMAP_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "heatmaps")
os.makedirs(HEATMAP_DIR, exist_ok=True)


@app.on_event("startup")
def startup():
    """Load the unified model at server startup."""
    # Look for the unified checkpoint — try ml-service dir first, then project root, then parent
    base = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(base, "medical_ai_system_final.pth"),
        os.path.join(base, "models", "medical_ai_system_final.pth"),
        os.path.join(base, "..", "..", "medical_ai_system_final.pth"),
    ]
    model_path = None
    for c in candidates:
        if os.path.isfile(c):
            model_path = c
            break

    if model_path is None:
        raise FileNotFoundError(
            f"Cannot find medical_ai_system_final.pth. Searched: {candidates}"
        )

    load_models(model_path)
    print("[INFO] ML Service ready.")


@app.get("/")
def health_check():
    return {"status": "online", "service": "VaidyaVision ML"}


@app.post("/predict")
async def predict_endpoint(
    file: UploadFile = File(...),
    modality: str = Form(None),
):
    """
    Run full inference pipeline:
    1. Route to correct expert (or use forced modality)
    2. MC Dropout uncertainty estimation
    3. GradCAM heatmap generation
    4. Save heatmap to public/heatmaps/ and return URL
    """
    try:
        contents = await file.read()

        # Run the real inference pipeline
        result = run_inference(
            image_bytes=contents,
            force_modality=modality if modality and modality in ["brain", "lung", "skin", "ecg"] else None,
            mc_samples=25,
            uncertainty_threshold=0.15,
        )

        # Save heatmap to disk as a file
        heatmap_url = None
        if "heatmap_base64" in result and result["heatmap_base64"]:
            heatmap_filename = f"heatmap_{int(time.time() * 1000)}.png"
            heatmap_path = os.path.join(HEATMAP_DIR, heatmap_filename)

            heatmap_bytes = base64.b64decode(result["heatmap_base64"])
            with open(heatmap_path, "wb") as f:
                f.write(heatmap_bytes)

            heatmap_url = f"/heatmaps/{heatmap_filename}"
            # Remove base64 from response (too large for JSON)
            del result["heatmap_base64"]

        result["heatmap_url"] = heatmap_url

        return result

    except Exception as e:
        traceback.print_exc()
        return {
            "status": "ERROR",
            "diagnosis": "Analysis Failed",
            "confidence": 0,
            "uncertainty": 1.0,
            "heatmap_url": None,
            "error": str(e),
        }


# ─── OCR Endpoints ──────────────────────────────────────────────

@app.post("/ocr/extract")
async def ocr_extract(
    file: UploadFile = File(...),
):
    """
    Extract text from a medical document image or PDF.
    Returns raw text, confidence, method used, and detected document type.
    """
    try:
        contents = await file.read()
        filename = file.filename or ""

        if filename.lower().endswith(".pdf"):
            result = ocr_engine.extract_from_pdf(contents)
        else:
            result = ocr_engine.extract_text(contents)

        return {"status": "success", **result}

    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


@app.post("/ocr/clean-report")
async def ocr_clean_report(
    file: UploadFile = File(None),
    raw_text: str = Form(None),
    document_type: str = Form("auto"),
):
    """
    Full pipeline: OCR extract (if file given) → Groq clean & structure.
    Can also accept raw_text directly to just run the cleaning step.
    """
    try:
        text = raw_text or ""

        # If a file is provided, extract text first
        if file and file.filename:
            contents = await file.read()
            filename = file.filename or ""

            if filename.lower().endswith(".pdf"):
                ocr_result = ocr_engine.extract_from_pdf(contents)
            else:
                ocr_result = ocr_engine.extract_text(contents)

            text = ocr_result.get("raw_text", "")
            if document_type == "auto":
                document_type = ocr_result.get("document_type", "medical_document")

        if not text.strip():
            return {"status": "error", "error": "No text could be extracted from the document"}

        # Preserve OCR-level metadata
        ocr_confidence = ocr_result.get("confidence") if file and file.filename else None
        ocr_method = ocr_result.get("method_used") if file and file.filename else None

        # Clean and structure with Groq
        cleaned = await clean_and_structure(text, document_type)

        result = {"status": "success", **cleaned}
        if ocr_confidence is not None:
            result["confidence"] = ocr_confidence
        if ocr_method is not None:
            result["method_used"] = ocr_method
        return result

    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


@app.post("/ocr/prescriptions-only")
async def ocr_prescriptions_only(
    file: UploadFile = File(None),
    raw_text: str = Form(None),
):
    """
    Extract only medication/prescription data from image or text.
    Quick endpoint for medication list extraction.
    """
    try:
        text = raw_text or ""

        if file and file.filename:
            contents = await file.read()
            filename = file.filename or ""

            if filename.lower().endswith(".pdf"):
                ocr_result = ocr_engine.extract_from_pdf(contents)
            else:
                ocr_result = ocr_engine.extract_text(contents)

            text = ocr_result.get("raw_text", "")

        if not text.strip():
            return {"status": "error", "error": "No text could be extracted"}

        prescriptions = ocr_engine.extract_prescriptions_only(text)

        return {"status": "success", **prescriptions}

    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


# ─── Research Endpoints ─────────────────────────────────────────

@app.post("/research/ask")
async def research_ask(
    query: str = Form(...),
    top_k: int = Form(5),
    crawl_if_empty: bool = Form(True),
):
    """
    Ask a medical research question. Uses RAG pipeline:
    1. Hybrid search (semantic + BM25) on indexed articles
    2. If insufficient results, crawl medical sources (rate-limited)
    3. Generate answer with Groq LLM using retrieved context
    """
    try:
        result = await ask_research(query, top_k=top_k, crawl_if_empty=crawl_if_empty)
        return {"status": "success", **result}
    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


@app.post("/research/crawl-latest")
async def research_crawl(
    query: str = Form("latest medical research breakthroughs"),
    max_sources: int = Form(2),
):
    """
    Crawl medical sources for a query and index the results.
    Rate-limited to conserve API credits.
    """
    try:
        rate = get_rate_stats()
        if not rate["can_crawl"]:
            return {
                "status": "rate_limited",
                "message": "API rate limit reached. Try again later.",
                "rate_stats": rate,
            }

        articles = crawler.search_medical(query, max_sources=max_sources)
        if articles:
            index_result = index_articles(articles)
            return {
                "status": "success",
                "articles_crawled": len(articles),
                "index_result": index_result,
                "rate_stats": get_rate_stats(),
            }
        else:
            return {
                "status": "no_results",
                "message": "No articles found for the query.",
                "rate_stats": get_rate_stats(),
            }

    except Exception as e:
        traceback.print_exc()
        return {"status": "error", "error": str(e)}


@app.get("/research/stats")
def research_stats():
    """Get research system statistics."""
    try:
        stats = get_research_stats()
        return {"status": "success", **stats}
    except Exception as e:
        return {"status": "error", "error": str(e)}


@app.get("/research/export-qa")
def research_export_qa():
    """Export Q&A history."""
    try:
        history = get_qa_history()
        return {"status": "success", "qa_history": history, "count": len(history)}
    except Exception as e:
        return {"status": "error", "error": str(e)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
