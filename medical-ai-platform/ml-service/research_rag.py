"""
Medical Research RAG (Retrieval-Augmented Generation).
Uses Groq LLM with retrieved context to answer medical research questions.
"""

import os
import json
import httpx
from typing import List, Dict, Optional
from datetime import datetime

from research_embeddings import hybrid_search, get_index_stats
from research_crawler import crawler, get_rate_stats, MEDICAL_SOURCES

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

QA_LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "research_cache", "qa_log.json")


# ─── Groq LLM Call ─────────────────────────────────────────────

async def _call_groq(messages: List[Dict], max_tokens: int = 2048, temperature: float = 0.3) -> str:
    """Call Groq API with messages."""
    if not GROQ_API_KEY:
        return "Error: GROQ_API_KEY not set"

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(GROQ_URL, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"]


# ─── RAG Pipeline ───────────────────────────────────────────────

SYSTEM_PROMPT = """You are VaidyaVision Research Assistant — a medical AI that answers health and medical research questions using provided source context.

RULES:
1. Answer based PRIMARILY on the provided context. If context is insufficient, say so and provide general medical knowledge with a disclaimer.
2. Always cite sources using [Source: title] format when using context.
3. Use clear, professional medical language accessible to both doctors and patients.
4. Include relevant statistics, study findings, or clinical guidelines when available.
5. If the question is about a specific condition, include: definition, causes, symptoms, diagnosis, treatment options.
6. Add a brief "Key Takeaway" at the end.
7. NEVER provide specific medical advice for individual patients. Always recommend consulting a healthcare provider.
8. Format your response with markdown headings and bullet points for readability."""


async def ask_research(query: str, top_k: int = 15, crawl_if_empty: bool = True) -> Dict:
    """
    Full RAG pipeline:
    1. Search the knowledge base (hybrid search)
    2. If no results and crawling allowed, crawl for the query
    3. Generate answer with Groq LLM using retrieved context
    """
    # Step 1: Search existing knowledge base
    search_results = hybrid_search(query, top_k=top_k)

    # Step 2: If no results, try crawling (rate-limited)
    crawl_performed = False
    if len(search_results) < 2 and crawl_if_empty:
        rate = get_rate_stats()
        if rate["can_crawl"]:
            new_articles = crawler.search_medical(query, max_sources=15)
            if new_articles:
                # Index the new articles
                from research_embeddings import index_articles
                index_articles(new_articles)
                # Re-search
                search_results = hybrid_search(query, top_k=top_k)
                crawl_performed = True

    # Step 3: Build context for LLM
    context_parts = []
    sources = []
    for i, result in enumerate(search_results):
        title = result.get("metadata", {}).get("title", f"Source {i+1}")
        source_name = result.get("metadata", {}).get("source", "Unknown")
        url = result.get("metadata", {}).get("url", "")
        content = result.get("content", "")[:1000]  # Limit per-source context

        context_parts.append(f"--- Source {i+1}: {title} ({source_name}) ---\n{content}")
        sources.append({
            "title": title,
            "source": source_name,
            "url": url,
            "relevance": round(result.get("score", 0), 3),
            "method": result.get("method", "unknown"),
        })

    context_text = "\n\n".join(context_parts) if context_parts else "No specific research context found."

    # Step 4: Generate answer
    has_context = len(search_results) > 0
    confidence = "high" if len(search_results) >= 3 else "medium" if len(search_results) >= 1 else "low"

    user_message = f"""Medical Research Question: {query}

Research Context:
{context_text}

{'Based on the above research context, provide a comprehensive answer.' if has_context else 'No research articles found. Provide a general answer based on medical knowledge, with clear disclaimers.'}"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]

    try:
        answer = await _call_groq(messages)
    except Exception as e:
        answer = f"Error generating answer: {str(e)}"
        confidence = "error"

    result = {
        "query": query,
        "answer": answer,
        "sources": sources,
        "confidence": confidence,
        "search_method": "hybrid",
        "results_found": len(search_results),
        "crawl_performed": crawl_performed,
        "timestamp": datetime.now().isoformat(),
    }

    # Log the Q&A
    _log_qa(result)

    return result


def _log_qa(qa_entry: Dict):
    """Log Q&A for export and analysis."""
    try:
        log = []
        if os.path.isfile(QA_LOG_FILE):
            with open(QA_LOG_FILE, "r") as f:
                log = json.load(f)
        log.append(qa_entry)
        # Keep last 100 entries
        log = log[-100:]
        with open(QA_LOG_FILE, "w") as f:
            json.dump(log, f, indent=2, default=str)
    except Exception:
        pass


def get_qa_history() -> List[Dict]:
    """Get Q&A history for export."""
    try:
        if os.path.isfile(QA_LOG_FILE):
            with open(QA_LOG_FILE, "r") as f:
                return json.load(f)
    except Exception:
        pass
    return []


def get_research_stats() -> Dict:
    """Get comprehensive research system stats."""
    index_stats = get_index_stats()
    rate_stats = get_rate_stats()
    cached_count = crawler.get_cached_articles_count()
    qa_count = len(get_qa_history())

    return {
        "index": index_stats,
        "rate_limits": rate_stats,
        "cached_articles": cached_count,
        "qa_history_count": qa_count,
        "sources": [s["name"] for s in MEDICAL_SOURCES],
    }
