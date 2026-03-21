"""
Medical Research Search Engine.
Uses BM25 keyword search + TF-IDF cosine similarity for hybrid search.
Stores articles as JSON — no external embedding models needed.
Falls back gracefully if optional deps are missing.
"""

import os
import json
import hashlib
import math
import re
from collections import Counter
from typing import List, Dict

# ─── Storage ────────────────────────────────────────────────────

STORE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "research_store")
os.makedirs(STORE_DIR, exist_ok=True)

ARTICLES_FILE = os.path.join(STORE_DIR, "articles.json")

_bm25 = None
_bm25_corpus = None
_articles_cache: List[Dict] = []


# ─── Text Processing ────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> List[str]:
    """Split text into overlapping chunks of approximately chunk_size words."""
    words = text.split()
    if len(words) <= chunk_size:
        return [text] if text.strip() else []
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
        i += chunk_size - overlap
    return chunks if chunks else [text[:2000]]


def clean_markdown(text: str) -> str:
    """Clean markdown artifacts for better search."""
    text = re.sub(r"#{1,6}\s*", "", text)
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    text = re.sub(r"[*_]{1,3}", "", text)
    text = re.sub(r"`{1,3}[^`]*`{1,3}", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def tokenize(text: str) -> List[str]:
    """Tokenize text for search."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    tokens = text.split()
    stopwords = {"the", "is", "at", "which", "on", "and", "or", "but", "in", "with",
                 "for", "to", "of", "an", "it", "this", "that", "are", "was", "were",
                 "been", "be", "have", "has", "had", "do", "does", "did", "will", "would",
                 "could", "should", "may", "might", "can", "from", "by", "as", "not", "no",
                 "its", "also", "than", "more", "very", "just", "about", "into", "over"}
    return [t for t in tokens if len(t) > 2 and t not in stopwords]


# ─── Article Store (JSON-based) ─────────────────────────────────

def _load_articles() -> List[Dict]:
    """Load articles from JSON store."""
    global _articles_cache
    if _articles_cache:
        return _articles_cache
    if os.path.isfile(ARTICLES_FILE):
        try:
            with open(ARTICLES_FILE, "r") as f:
                _articles_cache = json.load(f)
        except Exception:
            _articles_cache = []
    return _articles_cache


def _save_articles(articles: List[Dict]):
    """Save articles to JSON store."""
    global _articles_cache
    _articles_cache = articles
    with open(ARTICLES_FILE, "w") as f:
        json.dump(articles, f, indent=2, default=str)


# ─── Indexing ────────────────────────────────────────────────────

def index_articles(articles: List[Dict]) -> Dict:
    """Index crawled articles — chunk and store them."""
    existing = _load_articles()
    existing_ids = {a.get("id") for a in existing}

    indexed = 0
    skipped = 0

    for article in articles:
        content = article.get("content", "")
        if not content or len(content) < 50:
            skipped += 1
            continue

        url = article.get("url", article.get("cached_url", ""))
        title = article.get("title", "Unknown")
        source = article.get("source_name", "Unknown")
        source_type = article.get("source_type", "unknown")

        clean = clean_markdown(content)
        chunks = chunk_text(clean)

        for i, chunk in enumerate(chunks):
            doc_id = hashlib.md5(f"{url}_{i}".encode()).hexdigest()

            if doc_id in existing_ids:
                skipped += 1
                continue

            existing.append({
                "id": doc_id,
                "content": chunk,
                "title": title,
                "source": source,
                "source_type": source_type,
                "url": url,
                "chunk_index": i,
                "total_chunks": len(chunks),
                "tokens": tokenize(chunk),
            })
            existing_ids.add(doc_id)
            indexed += 1

    _save_articles(existing)
    _rebuild_bm25()

    return {
        "status": "success",
        "indexed": indexed,
        "skipped": skipped,
        "total_in_store": len(existing),
    }


# ─── BM25 Search ────────────────────────────────────────────────

def _rebuild_bm25():
    """Rebuild BM25 index from stored articles."""
    global _bm25, _bm25_corpus

    articles = _load_articles()
    if not articles:
        _bm25 = None
        _bm25_corpus = None
        return

    try:
        from rank_bm25 import BM25Okapi
        _bm25_corpus = [a.get("tokens", tokenize(a.get("content", ""))) for a in articles]
        if _bm25_corpus:
            _bm25 = BM25Okapi(_bm25_corpus)
            print(f"[INFO] BM25 index built with {len(_bm25_corpus)} documents")
        else:
            _bm25 = None
    except ImportError:
        print("[WARN] rank-bm25 not installed, using fallback TF-IDF search")
        _bm25 = None


def bm25_search(query: str, top_k: int = 10) -> List[Dict]:
    """Search using BM25 keyword matching."""
    global _bm25

    articles = _load_articles()
    if not articles:
        return []

    if _bm25 is None:
        _rebuild_bm25()

    tokens = tokenize(query)
    if not tokens:
        return []

    if _bm25 is not None:
        scores = _bm25.get_scores(tokens)
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

        results = []
        for idx in top_indices:
            if scores[idx] > 0:
                a = articles[idx]
                results.append({
                    "id": a["id"],
                    "content": a["content"],
                    "metadata": {
                        "title": a.get("title", ""),
                        "source": a.get("source", ""),
                        "source_type": a.get("source_type", ""),
                        "url": a.get("url", ""),
                    },
                    "score": float(scores[idx]),
                    "method": "bm25",
                })
        return results
    else:
        return _tfidf_search(query, articles, top_k)


# ─── TF-IDF Fallback Search ────────────────────────────────────

def _tfidf_search(query: str, articles: List[Dict], top_k: int = 10) -> List[Dict]:
    """Simple TF-IDF cosine similarity search as fallback."""
    query_tokens = tokenize(query)
    if not query_tokens:
        return []

    N = len(articles)
    doc_freq: Dict[str, int] = Counter()
    for a in articles:
        unique_tokens = set(a.get("tokens", tokenize(a.get("content", ""))))
        for t in unique_tokens:
            doc_freq[t] += 1

    query_tf = Counter(query_tokens)

    results = []
    for a in articles:
        doc_tokens = a.get("tokens", tokenize(a.get("content", "")))
        if not doc_tokens:
            continue

        doc_tf = Counter(doc_tokens)

        score = 0.0
        query_norm = 0.0
        doc_norm = 0.0

        all_terms = set(query_tokens) | set(doc_tokens)
        for term in all_terms:
            idf = math.log((N + 1) / (doc_freq.get(term, 0) + 1)) + 1
            q_tfidf = query_tf.get(term, 0) * idf
            d_tfidf = doc_tf.get(term, 0) * idf
            score += q_tfidf * d_tfidf
            query_norm += q_tfidf ** 2
            doc_norm += d_tfidf ** 2

        if query_norm > 0 and doc_norm > 0:
            score = score / (math.sqrt(query_norm) * math.sqrt(doc_norm))
        else:
            score = 0.0

        if score > 0:
            results.append({
                "id": a["id"],
                "content": a["content"],
                "metadata": {
                    "title": a.get("title", ""),
                    "source": a.get("source", ""),
                    "source_type": a.get("source_type", ""),
                    "url": a.get("url", ""),
                },
                "score": score,
                "method": "tfidf",
            })

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


# ─── Hybrid Search ──────────────────────────────────────────────

def hybrid_search(query: str, top_k: int = 5) -> List[Dict]:
    """
    Search using BM25 (or TF-IDF fallback).
    Returns top-k results ranked by relevance.
    """
    results = bm25_search(query, top_k=top_k * 2)

    if results:
        max_score = max(r["score"] for r in results) or 1
        for r in results:
            r["score"] = round(r["score"] / max_score, 4)

    return results[:top_k]


# ─── Stats ──────────────────────────────────────────────────────

def get_index_stats() -> Dict:
    """Return statistics about the search index."""
    articles = _load_articles()
    sources = set()
    for a in articles:
        sources.add(a.get("source", "Unknown"))

    return {
        "total_chunks": len(articles),
        "search_engine": "BM25 + TF-IDF",
        "sources": list(sources),
        "has_bm25": _bm25 is not None,
    }
