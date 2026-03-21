"use client";

import { useState, useCallback } from "react";
import {
    Search, BookOpen, ExternalLink, Loader2, Sparkles,
    Clock, TrendingUp, AlertCircle, ChevronDown, ChevronUp,
    Database, Zap, RefreshCw,
} from "lucide-react";

interface Source {
    title: string;
    source: string;
    url: string;
    relevance: number;
    method: string;
}

interface ResearchResult {
    query: string;
    answer: string;
    sources: Source[];
    confidence: string;
    search_method: string;
    results_found: number;
    crawl_performed: boolean;
    timestamp: string;
}

interface ResearchStats {
    index?: { total_chunks: number; embedding_model: string };
    rate_limits?: { calls_last_hour: number; calls_today: number; max_per_hour: number; max_per_day: number; can_crawl: boolean };
    cached_articles?: number;
    qa_history_count?: number;
}

const EXAMPLE_QUERIES = [
    "What are the latest treatments for Type 2 Diabetes?",
    "Brain tumor detection using MRI imaging",
    "Side effects of long-term corticosteroid use",
    "Latest research on ECG abnormality detection with AI",
    "Skin cancer early detection methods",
    "What is the role of AI in radiology?",
];

export default function ResearchPage() {
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<ResearchResult | null>(null);
    const [stats, setStats] = useState<ResearchStats | null>(null);
    const [showStats, setShowStats] = useState(false);
    const [history, setHistory] = useState<ResearchResult[]>([]);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch("/api/research/stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch {
            // Stats are optional
        }
    }, []);

    const askResearch = async (q?: string) => {
        const searchQuery = q || query;
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch("/api/research", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: searchQuery }),
            });

            if (!res.ok) throw new Error("Research request failed");

            const data = await res.json();
            if (data.status === "error") {
                setError(data.error || "Failed to get research results");
            } else {
                setResult(data);
                setHistory((prev) => [data, ...prev].slice(0, 10));
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to connect to research service");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            askResearch();
        }
    };

    const confidenceColor = (c: string) => {
        if (c === "high") return "bg-green-100 text-green-700";
        if (c === "medium") return "bg-amber-100 text-amber-700";
        return "bg-red-100 text-red-700";
    };

    const methodBadge = (m: string) => {
        if (m === "hybrid") return "bg-purple-100 text-purple-700";
        if (m === "semantic") return "bg-blue-100 text-blue-700";
        return "bg-gray-100 text-gray-700";
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-olive-900 font-display flex items-center gap-3">
                        <BookOpen className="w-7 h-7 text-olive-700" />
                        Medical Research Assistant
                    </h1>
                    <p className="text-olive-600 mt-1">
                        AI-powered research with RAG — search medical literature, WHO guidelines, and clinical sources
                    </p>
                </div>
                <button
                    onClick={() => { setShowStats(!showStats); if (!stats) fetchStats(); }}
                    className="p-2 text-olive-500 hover:text-olive-700 hover:bg-sage-100 rounded-lg transition-colors"
                    title="System Stats"
                >
                    <Database className="w-5 h-5" />
                </button>
            </div>

            {/* Stats Panel */}
            {showStats && stats && (
                <div className="bg-white border border-sage-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                        <p className="text-olive-500 text-xs">Indexed Chunks</p>
                        <p className="text-lg font-bold text-olive-900">{stats.index?.total_chunks || 0}</p>
                    </div>
                    <div>
                        <p className="text-olive-500 text-xs">Cached Articles</p>
                        <p className="text-lg font-bold text-olive-900">{stats.cached_articles || 0}</p>
                    </div>
                    <div>
                        <p className="text-olive-500 text-xs">API Calls Today</p>
                        <p className="text-lg font-bold text-olive-900">
                            {stats.rate_limits?.calls_today || 0}/{stats.rate_limits?.max_per_day || 50}
                        </p>
                    </div>
                    <div>
                        <p className="text-olive-500 text-xs">Q&A History</p>
                        <p className="text-lg font-bold text-olive-900">{stats.qa_history_count || 0}</p>
                    </div>
                </div>
            )}

            {/* Search Box */}
            <div className="bg-white border border-sage-200 rounded-xl p-5">
                <div className="relative">
                    <Search className="w-5 h-5 text-olive-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask a medical research question..."
                        className="w-full pl-12 pr-24 py-3.5 border border-sage-300 rounded-xl text-olive-900 focus:ring-2 focus:ring-olive-500 focus:border-olive-500 text-base"
                        disabled={loading}
                    />
                    <button
                        onClick={() => askResearch()}
                        disabled={loading || !query.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-olive-800 text-cream-50 rounded-lg text-sm font-medium hover:bg-olive-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Sparkles className="w-4 h-4" />
                        )}
                        {loading ? "Searching..." : "Ask"}
                    </button>
                </div>

                {/* Quick Examples */}
                {!result && !loading && (
                    <div className="mt-4">
                        <p className="text-xs text-olive-500 mb-2">Quick examples:</p>
                        <div className="flex flex-wrap gap-2">
                            {EXAMPLE_QUERIES.map((eq) => (
                                <button
                                    key={eq}
                                    onClick={() => { setQuery(eq); askResearch(eq); }}
                                    className="text-xs px-3 py-1.5 bg-sage-50 text-olive-600 rounded-full hover:bg-sage-100 hover:text-olive-800 transition-colors border border-sage-200"
                                >
                                    {eq}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="text-red-800 font-medium text-sm">Research Error</p>
                        <p className="text-red-600 text-sm mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="bg-white border border-sage-200 rounded-xl p-8 text-center">
                    <Loader2 className="w-8 h-8 text-olive-600 animate-spin mx-auto mb-3" />
                    <p className="text-olive-700 font-medium">Searching medical literature...</p>
                    <p className="text-olive-500 text-sm mt-1">Querying knowledge base & analyzing sources</p>
                </div>
            )}

            {/* Result */}
            {result && !loading && (
                <div className="space-y-4">
                    {/* Answer Card */}
                    <div className="bg-white border border-sage-200 rounded-xl p-6">
                        {/* Meta badges */}
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${confidenceColor(result.confidence)}`}>
                                {result.confidence === "high" ? "High Confidence" :
                                 result.confidence === "medium" ? "Medium Confidence" : "Low Confidence"}
                            </span>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${methodBadge(result.search_method)}`}>
                                <Zap className="w-3 h-3 inline mr-1" />
                                {result.search_method}
                            </span>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-sage-100 text-olive-600">
                                {result.results_found} source{result.results_found !== 1 ? "s" : ""} found
                            </span>
                            {result.crawl_performed && (
                                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
                                    <RefreshCw className="w-3 h-3 inline mr-1" />
                                    Live crawled
                                </span>
                            )}
                        </div>

                        {/* Answer text with markdown rendering */}
                        <div className="prose prose-olive prose-sm max-w-none">
                            {result.answer.split("\n").map((line, i) => {
                                if (line.startsWith("### ")) {
                                    return <h3 key={i} className="text-base font-semibold text-olive-900 mt-4 mb-2">{line.replace("### ", "")}</h3>;
                                }
                                if (line.startsWith("## ")) {
                                    return <h2 key={i} className="text-lg font-bold text-olive-900 mt-4 mb-2">{line.replace("## ", "")}</h2>;
                                }
                                if (line.startsWith("**Key Takeaway")) {
                                    return (
                                        <div key={i} className="mt-4 p-3 bg-olive-50 border border-olive-200 rounded-lg">
                                            <p className="text-olive-800 font-medium text-sm">{line.replace(/\*\*/g, "")}</p>
                                        </div>
                                    );
                                }
                                if (line.startsWith("- ") || line.startsWith("* ")) {
                                    return <li key={i} className="text-olive-700 text-sm ml-4">{line.replace(/^[-*]\s/, "").replace(/\*\*/g, "")}</li>;
                                }
                                if (line.trim() === "") return <br key={i} />;
                                return <p key={i} className="text-olive-700 text-sm mb-1">{line.replace(/\*\*/g, "")}</p>;
                            })}
                        </div>
                    </div>

                    {/* Sources */}
                    {result.sources.length > 0 && (
                        <div className="bg-white border border-sage-200 rounded-xl p-5">
                            <h3 className="text-sm font-semibold text-olive-900 mb-3 flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                Sources ({result.sources.length})
                            </h3>
                            <div className="space-y-3">
                                {result.sources.map((src, i) => (
                                    <div key={i} className="flex items-start justify-between p-3 bg-sage-50 rounded-lg border border-sage-200">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-olive-900 truncate">{src.title || "Untitled"}</p>
                                            <p className="text-xs text-olive-500 mt-0.5">{src.source}</p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                                            <span className="text-xs px-2 py-0.5 bg-olive-100 text-olive-700 rounded-full">
                                                {Math.round(src.relevance * 100)}%
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${methodBadge(src.method)}`}>
                                                {src.method}
                                            </span>
                                            {src.url && (
                                                <a
                                                    href={src.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1 text-olive-400 hover:text-olive-700"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* History */}
            {history.length > 1 && (
                <div className="bg-white border border-sage-200 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-olive-900 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Recent Queries
                    </h3>
                    <div className="space-y-2">
                        {history.slice(1).map((h, i) => (
                            <button
                                key={i}
                                onClick={() => { setQuery(h.query); setResult(h); }}
                                className="w-full text-left p-2.5 hover:bg-sage-50 rounded-lg transition-colors flex items-center justify-between"
                            >
                                <span className="text-sm text-olive-700 truncate">{h.query}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${confidenceColor(h.confidence)}`}>
                                    {h.confidence}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
