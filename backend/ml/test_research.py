#!/usr/bin/env python3
"""
End-to-end test for the Medical Research Assistant pipeline.
Tests: Firecrawl crawling → Indexing → BM25 Search → Groq RAG
"""
import os
import sys
import asyncio

# Set API keys
os.environ.setdefault("FIRECRAWL_API_KEY", "fc-b82ca843586b465185ac93824fb9ef6a")
os.environ.setdefault("GROQ_API_KEY", "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")


def test_crawler():
    """Step 1: Test Firecrawl web scraping."""
    print("=" * 60)
    print("STEP 1: Testing Firecrawl Web Scraping")
    print("=" * 60)

    from research_crawler import crawler, get_rate_stats

    # Check rate stats
    stats = get_rate_stats()
    print(f"  Rate limits: {stats['calls_last_hour']}/{stats['max_per_hour']} per hour, "
          f"{stats['calls_today']}/{stats['max_per_day']} per day")
    print(f"  Can crawl: {stats['can_crawl']}")
    print()

    # Test crawling
    print("  Crawling medical sources for 'diabetes treatment'...")
    results = crawler.search_medical("diabetes treatment", max_sources=2)

    print(f"  Crawled {len(results)} sources:")
    for r in results:
        title = r.get("title", "No title")[:70]
        source = r.get("source_name", "Unknown")
        content_len = len(r.get("content", ""))
        cached = r.get("from_cache", False)
        print(f"    [{source}] {title}")
        print(f"      Content length: {content_len} chars | From cache: {cached}")

    if len(results) == 0:
        print("  ⚠️  No results crawled (may be rate limited)")
    else:
        print(f"\n  ✅ Firecrawl working! Got {len(results)} articles")

    print()
    return results


def test_indexing(articles):
    """Step 2: Test indexing articles into the search store."""
    print("=" * 60)
    print("STEP 2: Testing Article Indexing")
    print("=" * 60)

    from research_embeddings import index_articles, get_index_stats

    result = index_articles(articles)
    print(f"  Indexed: {result.get('indexed', 0)} chunks")
    print(f"  Skipped: {result.get('skipped', 0)}")
    print(f"  Total in store: {result.get('total_in_store', 0)}")

    stats = get_index_stats()
    print(f"  Search engine: {stats.get('search_engine', 'N/A')}")
    print(f"  Has BM25: {stats.get('has_bm25', False)}")
    print(f"  Sources: {stats.get('sources', [])}")

    if result.get("total_in_store", 0) > 0 or result.get("indexed", 0) > 0:
        print("\n  ✅ Indexing working!")
    else:
        print("\n  ⚠️  No articles indexed")

    print()


def test_search():
    """Step 3: Test BM25/TF-IDF search on indexed articles."""
    print("=" * 60)
    print("STEP 3: Testing Search (BM25 + TF-IDF)")
    print("=" * 60)

    from research_embeddings import hybrid_search

    query = "diabetes treatment options"
    print(f"  Query: '{query}'")
    results = hybrid_search(query, top_k=3)

    print(f"  Found {len(results)} results:")
    for i, r in enumerate(results):
        title = r.get("metadata", {}).get("title", "N/A")[:60]
        score = r.get("score", 0)
        method = r.get("method", "?")
        content_preview = r.get("content", "")[:100].replace("\n", " ")
        print(f"    {i+1}. [{method}] score={score:.4f} | {title}")
        print(f"       Preview: {content_preview}...")

    if results:
        print(f"\n  ✅ Search working! Found {len(results)} relevant chunks")
    else:
        print("\n  ⚠️  No search results (index may be empty)")

    print()
    return results


def test_rag():
    """Step 4: Test full RAG pipeline with Groq LLM."""
    print("=" * 60)
    print("STEP 4: Testing RAG with Groq LLM")
    print("=" * 60)

    from research_rag import ask_research

    query = "What are the latest treatments for type 2 diabetes?"
    print(f"  Query: '{query}'")
    print("  Generating answer with Groq...")
    print()

    result = asyncio.run(ask_research(query, top_k=3, crawl_if_empty=False))

    print(f"  Status: confidence={result.get('confidence', '?')}")
    print(f"  Sources used: {result.get('results_found', 0)}")
    print(f"  Crawl performed: {result.get('crawl_performed', False)}")
    print(f"  Search method: {result.get('search_method', '?')}")
    print()

    answer = result.get("answer", "No answer")
    # Print first 500 chars of answer
    print("  --- Answer (first 500 chars) ---")
    print(f"  {answer[:500]}")
    if len(answer) > 500:
        print(f"  ... ({len(answer)} total chars)")
    print()

    sources = result.get("sources", [])
    if sources:
        print(f"  --- Sources ({len(sources)}) ---")
        for s in sources[:3]:
            print(f"    • {s.get('title', 'N/A')[:60]} [{s.get('source', '?')}] "
                  f"relevance={s.get('relevance', 0)}")

    if result.get("answer") and len(result["answer"]) > 50:
        print(f"\n  ✅ RAG working! Generated {len(answer)} char answer")
    else:
        print("\n  ⚠️  RAG may have issues")

    print()
    return result


def main():
    print()
    print("🔬 VaidyaVision Medical Research Assistant — End-to-End Test")
    print("=" * 60)
    print()

    # Step 1: Crawl
    articles = test_crawler()

    # Step 2: Index
    if articles:
        test_indexing(articles)
    else:
        print("⚠️  Skipping indexing (no articles crawled)")
        print()

    # Step 3: Search
    test_search()

    # Step 4: RAG
    test_rag()

    print("=" * 60)
    print("🏁 All tests complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
