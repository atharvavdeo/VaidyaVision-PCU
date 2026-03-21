"""
Medical Research Crawler using Firecrawl API.
Crawls PubMed, Medical News Today, WHO and other medical sources.
Rate-limited to conserve API credits.
"""

import os
import json
import time
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Optional

try:
    from firecrawl import FirecrawlApp
except ImportError:
    FirecrawlApp = None

# ─── Configuration ──────────────────────────────────────────────

FIRECRAWL_API_KEY = os.getenv("FIRECRAWL_API_KEY", "fc-b82ca843586b465185ac93824fb9ef6a")

MEDICAL_SOURCES = [
    {
        "name": "PubMed Central",
        "url": "https://pubmed.ncbi.nlm.nih.gov/",
        "search_url": "https://pubmed.ncbi.nlm.nih.gov/?term={query}&sort=date",
        "type": "research",
    },
    {
        "name": "Medical News Today",
        "url": "https://www.medicalnewstoday.com/",
        "search_url": "https://www.medicalnewstoday.com/search?q={query}",
        "type": "news",
    },
    {
        "name": "WHO",
        "url": "https://www.who.int/",
        "search_url": "https://www.who.int/news?search={query}",
        "type": "guidelines",
    },
    {
        "name": "Mayo Clinic",
        "url": "https://www.mayoclinic.org/",
        "search_url": "https://www.mayoclinic.org/search/search-results?q={query}",
        "type": "clinical",
    },
]

# Rate limiting: max calls per period
MAX_CRAWLS_PER_HOUR = 15
MAX_CRAWLS_PER_DAY = 50

CACHE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "research_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

RATE_LOG = os.path.join(CACHE_DIR, "rate_log.json")


# ─── Rate Limiter ───────────────────────────────────────────────

def _load_rate_log() -> List[float]:
    if os.path.isfile(RATE_LOG):
        try:
            with open(RATE_LOG, "r") as f:
                return json.load(f)
        except Exception:
            return []
    return []


def _save_rate_log(log: List[float]):
    with open(RATE_LOG, "w") as f:
        json.dump(log, f)


def _check_rate_limit() -> bool:
    """Return True if we can make another API call."""
    log = _load_rate_log()
    now = time.time()

    # Clean entries older than 24 hours
    log = [t for t in log if now - t < 86400]

    hour_ago = now - 3600
    calls_last_hour = sum(1 for t in log if t > hour_ago)
    calls_today = len(log)

    return calls_last_hour < MAX_CRAWLS_PER_HOUR and calls_today < MAX_CRAWLS_PER_DAY


def _record_api_call():
    log = _load_rate_log()
    log.append(time.time())
    # Keep only last 24 hours
    now = time.time()
    log = [t for t in log if now - t < 86400]
    _save_rate_log(log)


def get_rate_stats() -> Dict:
    log = _load_rate_log()
    now = time.time()
    log = [t for t in log if now - t < 86400]
    hour_ago = now - 3600
    return {
        "calls_last_hour": sum(1 for t in log if t > hour_ago),
        "calls_today": len(log),
        "max_per_hour": MAX_CRAWLS_PER_HOUR,
        "max_per_day": MAX_CRAWLS_PER_DAY,
        "can_crawl": _check_rate_limit(),
    }


# ─── Cache ──────────────────────────────────────────────────────

def _cache_key(url: str) -> str:
    return hashlib.md5(url.encode()).hexdigest()


def _get_cached(url: str, max_age_hours: int = 24) -> Optional[Dict]:
    key = _cache_key(url)
    path = os.path.join(CACHE_DIR, f"{key}.json")
    if os.path.isfile(path):
        try:
            with open(path, "r") as f:
                data = json.load(f)
            cached_at = data.get("cached_at", 0)
            if time.time() - cached_at < max_age_hours * 3600:
                return data
        except Exception:
            pass
    return None


def _save_cache(url: str, data: Dict):
    key = _cache_key(url)
    path = os.path.join(CACHE_DIR, f"{key}.json")
    data["cached_at"] = time.time()
    data["cached_url"] = url
    with open(path, "w") as f:
        json.dump(data, f, default=str)


# ─── Crawler ────────────────────────────────────────────────────

class MedicalResearchCrawler:
    def __init__(self):
        if FirecrawlApp is None:
            print("[WARN] firecrawl package not installed. Using cache-only mode.")
            self.app = None
        else:
            self.app = FirecrawlApp(api_key=FIRECRAWL_API_KEY)

    def crawl_url(self, url: str, use_cache: bool = True) -> Optional[Dict]:
        """Crawl a single URL with rate limiting and caching."""
        # Check cache first
        if use_cache:
            cached = _get_cached(url)
            if cached:
                cached["from_cache"] = True
                return cached

        # Rate limit check
        if not _check_rate_limit():
            print(f"[RATE LIMIT] Cannot crawl {url} — limit reached")
            return None

        if self.app is None:
            print("[WARN] Firecrawl not available, no cached data for:", url)
            return None

        try:
            _record_api_call()
            result = self.app.scrape(
                url,
                formats=["markdown"],
                only_main_content=True,
            )

            # result is a Document object, access attributes directly
            metadata = getattr(result, 'metadata', {}) or {}
            markdown = getattr(result, 'markdown', '') or ''

            data = {
                "url": url,
                "title": metadata.get("title", "") if isinstance(metadata, dict) else getattr(metadata, 'title', ''),
                "description": metadata.get("description", "") if isinstance(metadata, dict) else getattr(metadata, 'description', ''),
                "content": markdown,
                "source_type": "crawled",
                "crawled_at": datetime.now().isoformat(),
                "from_cache": False,
            }

            # Cache it
            _save_cache(url, data)
            return data

        except Exception as e:
            print(f"[ERROR] Failed to crawl {url}: {e}")
            return None

    def search_medical(self, query: str, max_sources: int = 3) -> List[Dict]:
        """
        Search medical sources for a query. Rate-limited.
        Returns list of crawled article data.
        """
        results = []
        sources_crawled = 0

        for source in MEDICAL_SOURCES:
            if sources_crawled >= max_sources:
                break

            search_url = source["search_url"].format(query=query.replace(" ", "+"))

            # Check cache for this search
            cached = _get_cached(search_url, max_age_hours=6)
            if cached:
                cached["source_name"] = source["name"]
                cached["source_type"] = source["type"]
                cached["from_cache"] = True
                results.append(cached)
                sources_crawled += 1
                continue

            # Rate limit check
            if not _check_rate_limit():
                print(f"[RATE LIMIT] Stopping at {sources_crawled} sources")
                break

            data = self.crawl_url(search_url, use_cache=False)
            if data:
                data["source_name"] = source["name"]
                data["source_type"] = source["type"]
                results.append(data)
                sources_crawled += 1

            # Small delay between API calls
            time.sleep(1)

        return results

    def get_cached_articles_count(self) -> int:
        """Return count of cached articles."""
        count = 0
        for f in os.listdir(CACHE_DIR):
            if f.endswith(".json") and f != "rate_log.json":
                count += 1
        return count

    def get_all_cached_content(self) -> List[Dict]:
        """Return all cached article data for embedding."""
        articles = []
        for f in os.listdir(CACHE_DIR):
            if f.endswith(".json") and f != "rate_log.json":
                path = os.path.join(CACHE_DIR, f)
                try:
                    with open(path, "r") as fh:
                        data = json.load(fh)
                    if data.get("content"):
                        articles.append(data)
                except Exception:
                    continue
        return articles


# Singleton instance
crawler = MedicalResearchCrawler()
