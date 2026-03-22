"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key, Plus, Copy, Check, Trash2, Eye, EyeOff,
  Shield, Zap, Code2, Globe, AlertTriangle,
  Terminal, BookOpen, ChevronDown, ChevronUp,
  Activity, Clock, Lock, CreditCard, TrendingUp,
  BarChart3, PieChart as PieIcon, Receipt, Star,
  X, Loader2, CheckCircle2, ArrowRight, Sparkles,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, LineChart, Line, Legend,
} from "recharts";

/* ─── Types ─── */
interface ApiKey {
  id: number;
  name: string;
  key: string;
  fullKey?: string;
  prefix: string;
  environment: "test" | "live";
  scopes: string;
  lastUsedAt: string | null;
  requestCount: number;
  rateLimit: number;
  isActive: boolean;
  createdAt: string;
}

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  requestsPerDay: string;
  maxKeys: number;
  rateLimit: string;
  features: string[];
  popular?: boolean;
  icon: React.ElementType;
}

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  plan: string;
  overage: number;
  description: string;
}

/* ─── Constants ─── */
const OVERAGE_RATE = 0.50; // ₹0.50 per extra request

const PRICING_PLANS: PricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 0,
    period: "forever",
    description: "Perfect for exploring the API and building prototypes",
    requestsPerDay: "50",
    maxKeys: 1,
    rateLimit: "10/min",
    features: [
      "50 requests/day",
      "1 API key",
      "10 requests/min rate limit",
      "Community support",
      "Test environment only",
      "Basic analytics",
    ],
    icon: Zap,
  },
  {
    id: "professional",
    name: "Professional",
    price: 49,
    period: "/mo",
    description: "For teams shipping production SaMD integrations",
    requestsPerDay: "1,000",
    maxKeys: 5,
    rateLimit: "60/min",
    features: [
      "1,000 requests/day",
      "5 API keys",
      "60 requests/min rate limit",
      "Priority email support",
      "Live + Test environments",
      "Advanced analytics & webhooks",
      "Overage at ₹0.50/req",
      "Limits expand with usage",
    ],
    popular: true,
    icon: Star,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 249,
    period: "/mo",
    description: "Unlimited scale with dedicated infrastructure",
    requestsPerDay: "Unlimited",
    maxKeys: 25,
    rateLimit: "Unlimited",
    features: [
      "Unlimited requests",
      "25 API keys",
      "No rate limit",
      "Dedicated support engineer",
      "Live + Test environments",
      "Custom model fine-tuning",
      "HIPAA + SOC 2 compliance",
      "SLA guarantee (99.99%)",
      "On-premise deployment option",
    ],
    icon: Shield,
  },
];

const AVAILABLE_SCOPES = [
  { id: "predict", label: "Image Inference", desc: "Submit medical images for AI diagnosis", icon: Zap },
  { id: "ocr", label: "OCR / Prescriptions", desc: "Extract text from medical documents", icon: Eye },
  { id: "research", label: "Research Q&A", desc: "Query the medical research knowledge base", icon: BookOpen },
  { id: "reports", label: "Reports", desc: "Generate & retrieve diagnostic reports", icon: Code2 },
];

const ENDPOINTS = [
  {
    method: "POST",
    path: "/v1/predict",
    desc: "Submit a medical image for AI-powered diagnosis",
    scopes: ["predict"],
    params: [
      { name: "file", type: "File", required: true, desc: "Medical image (JPEG, PNG, DICOM)" },
      { name: "modality", type: "string", required: true, desc: "One of: lung, brain, skin, ecg" },
      { name: "priority", type: "string", required: false, desc: "triage priority: normal | urgent" },
    ],
    response: `{
  "id": "pred_abc123",
  "diagnosis": "Pneumothorax detected",
  "confidence": 0.94,
  "triage_score": 8,
  "heatmap_url": "https://api.vaidyavision.com/heatmaps/pred_abc123.png",
  "similar_cases": 3,
  "processing_time_ms": 1240
}`,
    curl: `curl -X POST https://api.vaidyavision.com/v1/predict \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@chest_xray.jpg" \\
  -F "modality=lung"`,
    python: `import requests

resp = requests.post(
    "https://api.vaidyavision.com/v1/predict",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    files={"file": open("chest_xray.jpg", "rb")},
    data={"modality": "lung"}
)
print(resp.json())`,
    node: `const form = new FormData();
form.append("file", fs.createReadStream("chest_xray.jpg"));
form.append("modality", "lung");

const { data } = await axios.post(
  "https://api.vaidyavision.com/v1/predict",
  form,
  { headers: { Authorization: "Bearer YOUR_API_KEY" } }
);`,
  },
  {
    method: "POST",
    path: "/v1/ocr/extract",
    desc: "Extract structured text from prescriptions and medical documents",
    scopes: ["ocr"],
    params: [
      { name: "file", type: "File", required: true, desc: "Document image (JPEG, PNG, PDF)" },
      { name: "format", type: "string", required: false, desc: "Output: json | fhir | text" },
    ],
    response: `{
  "id": "ocr_def456",
  "medications": [
    { "name": "Amoxicillin", "dosage": "500mg", "frequency": "3x daily", "duration": "7 days" }
  ],
  "diagnoses": ["Upper respiratory infection"],
  "doctor": "Dr. Smith",
  "date": "2025-02-10"
}`,
    curl: `curl -X POST https://api.vaidyavision.com/v1/ocr/extract \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@prescription.jpg"`,
    python: `resp = requests.post(
    "https://api.vaidyavision.com/v1/ocr/extract",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    files={"file": open("prescription.jpg", "rb")}
)`,
    node: `const form = new FormData();
form.append("file", fs.createReadStream("prescription.jpg"));

const { data } = await axios.post(
  "https://api.vaidyavision.com/v1/ocr/extract",
  form,
  { headers: { Authorization: "Bearer YOUR_API_KEY" } }
);`,
  },
  {
    method: "POST",
    path: "/v1/research/ask",
    desc: "Query the medical RAG knowledge base with natural language",
    scopes: ["research"],
    params: [
      { name: "query", type: "string", required: true, desc: "Natural language question" },
      { name: "top_k", type: "number", required: false, desc: "Number of sources (default 5)" },
    ],
    response: `{
  "answer": "Recent studies show that AI-assisted chest X-ray analysis...",
  "sources": [
    { "title": "Deep Learning in Radiology", "journal": "Nature Medicine", "year": 2024, "relevance": 0.96 }
  ],
  "confidence": 0.91
}`,
    curl: `curl -X POST https://api.vaidyavision.com/v1/research/ask \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "Latest AI methods for chest X-ray analysis"}'`,
    python: `resp = requests.post(
    "https://api.vaidyavision.com/v1/research/ask",
    headers={
        "Authorization": "Bearer YOUR_API_KEY",
        "Content-Type": "application/json"
    },
    json={"query": "Latest AI methods for chest X-ray analysis"}
)`,
    node: `const { data } = await axios.post(
  "https://api.vaidyavision.com/v1/research/ask",
  { query: "Latest AI methods for chest X-ray analysis" },
  { headers: { Authorization: "Bearer YOUR_API_KEY" } }
);`,
  },
];

const DUMMY_INVOICES: Invoice[] = [
  { id: "INV-2026-001", date: "2026-02-01", amount: 49.00, status: "paid", plan: "Professional", overage: 0, description: "Monthly subscription" },
  { id: "INV-2026-002", date: "2026-02-01", amount: 125.00, status: "paid", plan: "Professional", overage: 250, description: "Overage: 250 extra requests" },
  { id: "INV-2026-003", date: "2026-01-01", amount: 49.00, status: "paid", plan: "Professional", overage: 0, description: "Monthly subscription" },
  { id: "INV-2025-012", date: "2025-12-01", amount: 49.00, status: "paid", plan: "Professional", overage: 0, description: "Monthly subscription" },
  { id: "INV-2025-011", date: "2025-11-01", amount: 0.00, status: "paid", plan: "Starter", overage: 0, description: "Free tier" },
];

/* ─── Dummy data generators ─── */
function generateDailyUsage() {
  const data = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const base = 200 + Math.floor(Math.random() * 600);
    data.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      requests: base,
      errors: Math.floor(base * (0.01 + Math.random() * 0.03)),
      latency: 180 + Math.floor(Math.random() * 120),
    });
  }
  return data;
}

function generateEndpointBreakdown() {
  return [
    { name: "Image Inference", value: 4820, color: "#5c6340" },
    { name: "OCR Extract", value: 2340, color: "#7a8450" },
    { name: "Research Q&A", value: 1560, color: "#9cad60" },
    { name: "Reports", value: 890, color: "#b8c97a" },
  ];
}

function generateHourlyDistribution() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: `${i.toString().padStart(2, "0")}:00`,
    requests: Math.floor(
      i >= 8 && i <= 18
        ? 100 + Math.random() * 300
        : 10 + Math.random() * 50
    ),
  }));
}

/* ─── Helpers ─── */
function formatCardNumber(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

/* ─── Component ─── */
export default function DeveloperApiPage() {
  /* ── state ── */
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"keys" | "usage" | "endpoints" | "billing">("keys");
  const [codeTab, setCodeTab] = useState<"curl" | "python" | "node">("curl");
  const [expandedEndpoint, setExpandedEndpoint] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // create-key modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyEnv, setNewKeyEnv] = useState<"test" | "live">("test");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["predict", "ocr"]);

  // reveal-key modal
  const [revealedFullKey, setRevealedFullKey] = useState<string | null>(null);

  // revoke confirm modal
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [revoking, setRevoking] = useState(false);

  // pricing modal
  const [showPricingModal, setShowPricingModal] = useState(false);

  // payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  // billing state
  const [currentPlan, setCurrentPlan] = useState<PricingPlan>(PRICING_PLANS[1]); // Professional

  // usage data
  const [dailyUsage] = useState(generateDailyUsage);
  const [endpointBreakdown] = useState(generateEndpointBreakdown);
  const [hourlyDistribution] = useState(generateHourlyDistribution);

  /* ── data fetching ── */
  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/developer/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch (e) {
      console.error("Failed to fetch keys", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  /* ── handlers ── */
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/developer/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          environment: newKeyEnv,
          scopes: selectedScopes.join(","),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRevealedFullKey(data.key.fullKey);
        setShowCreateModal(false);
        setNewKeyName("");
        setNewKeyEnv("test");
        setSelectedScopes(["predict", "ocr"]);
        fetchKeys();
      }
    } catch (e) {
      console.error("Failed to create key", e);
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await fetch(`/api/developer/keys?id=${revokeTarget.id}`, { method: "DELETE" });
      setRevokeTarget(null);
      fetchKeys();
    } catch (e) {
      console.error("Failed to revoke key", e);
    } finally {
      setRevoking(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSelectPlan = (plan: PricingPlan) => {
    if (plan.id === "starter") {
      setCurrentPlan(plan);
      setShowPricingModal(false);
      return;
    }
    setSelectedPlan(plan);
    setShowPricingModal(false);
    setShowPaymentModal(true);
    setPaymentSuccess(false);
    setCardNumber("");
    setCardExpiry("");
    setCardCvc("");
    setCardName("");
  };

  const handlePayment = async () => {
    setPaymentProcessing(true);
    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2000));
    setPaymentProcessing(false);
    setPaymentSuccess(true);
    if (selectedPlan) setCurrentPlan(selectedPlan);
    setTimeout(() => {
      setShowPaymentModal(false);
      setPaymentSuccess(false);
    }, 2500);
  };

  /* ── computed ── */
  const totalRequests = dailyUsage.reduce((s, d) => s + d.requests, 0);
  const totalErrors = dailyUsage.reduce((s, d) => s + d.errors, 0);
  const avgLatency = Math.round(dailyUsage.reduce((s, d) => s + d.latency, 0) / dailyUsage.length);
  const dailyLimit = currentPlan.id === "enterprise" ? Infinity : parseInt(currentPlan.requestsPerDay.replace(/,/g, ""));
  const todayUsage = dailyUsage[dailyUsage.length - 1]?.requests || 0;
  const usagePercent = dailyLimit === Infinity ? 5 : Math.min((todayUsage / dailyLimit) * 100, 100);
  const overage = dailyLimit === Infinity ? 0 : Math.max(0, todayUsage - dailyLimit);
  const overageCost = overage * OVERAGE_RATE;

  /* ─── Render helpers ─── */
  const tabs = [
    { id: "keys" as const, label: "API Keys", icon: Key },
    { id: "usage" as const, label: "Usage & Analytics", icon: BarChart3 },
    { id: "endpoints" as const, label: "Endpoints", icon: Globe },
    { id: "billing" as const, label: "Billing", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-cream-50 p-6">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-olive-900 flex items-center gap-2">
            <Code2 className="h-7 w-7 text-olive-600" />
            Developer API
          </h1>
          <p className="text-sage-600 mt-1">
            Integrate VaidyaVision SaMD capabilities into your applications
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPricingModal(true)}
            className="flex items-center gap-2 rounded-xl border border-olive-200 bg-white px-4 py-2 text-sm font-medium text-olive-700 hover:bg-olive-50 transition-colors"
          >
            <TrendingUp className="h-4 w-4" />
            {currentPlan.name} Plan
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-olive-600 px-4 py-2 text-sm font-medium text-white hover:bg-olive-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New API Key
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-6 flex gap-1 rounded-xl bg-olive-100/50 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
              activeTab === t.id
                ? "bg-white text-olive-800 shadow-sm"
                : "text-sage-600 hover:text-olive-700"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ Tab: API Keys ═══════════════════ */}
      {activeTab === "keys" && (
        <div className="space-y-6">
          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Active Keys", value: keys.filter((k) => k.isActive).length, icon: Key, color: "olive" },
              { label: "Total Requests (30d)", value: totalRequests.toLocaleString(), icon: Activity, color: "olive" },
              { label: "Today's Usage", value: todayUsage.toLocaleString(), icon: TrendingUp, color: usagePercent > 80 ? "red" : "olive" },
              { label: "Current Plan", value: currentPlan.name, icon: Shield, color: "olive" },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-olive-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sage-600 mb-1">
                  <s.icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                <p className={`text-xl font-bold ${s.color === "red" ? "text-red-600" : "text-olive-800"}`}>
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {/* Usage bar */}
          <div className="rounded-xl border border-olive-200 bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-olive-700">Today&apos;s Usage</span>
              <span className="text-xs text-sage-600">
                {todayUsage.toLocaleString()} / {dailyLimit === Infinity ? "∞" : dailyLimit.toLocaleString()} requests
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-olive-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-olive-500"
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            {overage > 0 && (
              <p className="mt-1 text-xs text-amber-600">
                ⚠ {overage.toLocaleString()} requests over limit — overage cost: ₹{overageCost.toFixed(2)}
              </p>
            )}
          </div>

          {/* Keys table */}
          <div className="rounded-xl border border-olive-200 bg-white overflow-hidden">
            <div className="border-b border-olive-100 bg-olive-50/50 px-6 py-3">
              <h3 className="text-sm font-semibold text-olive-800">Your API Keys</h3>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-olive-500" />
              </div>
            ) : keys.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-sage-500">
                <Key className="h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">No API keys yet</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-3 text-sm text-olive-600 hover:underline"
                >
                  Create your first key →
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-olive-100 text-left text-xs font-medium text-sage-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Key</th>
                    <th className="px-6 py-3">Environment</th>
                    <th className="px-6 py-3">Scopes</th>
                    <th className="px-6 py-3">Requests</th>
                    <th className="px-6 py-3">Rate Limit</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-olive-50">
                  {keys.map((k) => (
                    <tr key={k.id} className="hover:bg-olive-50/30 transition-colors">
                      <td className="px-6 py-3 font-medium text-olive-800">{k.name}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-olive-100 px-2 py-0.5 text-xs font-mono text-olive-700">
                            {k.key}
                          </code>
                          <button
                            onClick={() => copyToClipboard(k.key, `masked-${k.id}`)}
                            className="text-sage-400 hover:text-olive-600 transition-colors"
                            title="Copy masked key"
                          >
                            {copiedKey === `masked-${k.id}` ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          k.environment === "live"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${k.environment === "live" ? "bg-green-500" : "bg-amber-500"}`} />
                          {k.environment}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.split(",").map((s) => (
                            <span key={s} className="rounded bg-sage-100 px-1.5 py-0.5 text-xs text-sage-700">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-olive-700">{k.requestCount.toLocaleString()}</td>
                      <td className="px-6 py-3 text-olive-700">{k.rateLimit}/min</td>
                      <td className="px-6 py-3 text-sage-500">
                        {new Date(k.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => setRevokeTarget(k)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Revoke key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Quick test snippet */}
          <div className="rounded-xl border border-olive-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-olive-800 mb-3 flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Quick Test
            </h3>
            <pre className="rounded-lg bg-zinc-900 p-4 text-sm text-emerald-300 font-mono overflow-x-auto">
{`curl -X POST https://api.vaidyavision.com/v1/predict \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@chest_xray.jpg" \\
  -F "modality=lung"`}
            </pre>
          </div>
        </div>
      )}

      {/* ═══════════════════ Tab: Usage & Analytics ═══════════════════ */}
      {activeTab === "usage" && (
        <div className="space-y-6">
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Total Requests (30d)", value: totalRequests.toLocaleString(), sub: "+12.4% vs last period", icon: Activity },
              { label: "Error Rate", value: `${((totalErrors / totalRequests) * 100).toFixed(2)}%`, sub: `${totalErrors.toLocaleString()} errors`, icon: AlertTriangle },
              { label: "Avg Latency", value: `${avgLatency}ms`, sub: "P95: ~320ms", icon: Clock },
              { label: "Active Keys", value: keys.filter((k) => k.isActive).length.toString(), sub: `of ${keys.length} total`, icon: Key },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-olive-200 bg-white p-4">
                <div className="flex items-center gap-2 text-sage-600 mb-1">
                  <s.icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{s.label}</span>
                </div>
                <p className="text-xl font-bold text-olive-800">{s.value}</p>
                <p className="text-xs text-sage-500 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Area chart — requests over time */}
          <div className="rounded-xl border border-olive-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-olive-800 mb-4">Requests Over Time (30 days)</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyUsage}>
                <defs>
                  <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5c6340" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#5c6340" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7d5" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #d4d8c0", fontSize: 12 }}
                />
                <Area type="monotone" dataKey="requests" stroke="#5c6340" fillOpacity={1} fill="url(#colorReq)" strokeWidth={2} />
                <Area type="monotone" dataKey="errors" stroke="#ef4444" fillOpacity={0.1} fill="#ef4444" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Two-column: Pie + Bar */}
          <div className="grid grid-cols-2 gap-6">
            {/* Pie chart — endpoint breakdown */}
            <div className="rounded-xl border border-olive-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-olive-800 mb-4 flex items-center gap-2">
                <PieIcon className="h-4 w-4" />
                Endpoint Breakdown
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={endpointBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    dataKey="value"
                    stroke="none"
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {endpointBreakdown.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => typeof value === 'number' ? value.toLocaleString() : value} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar chart — hourly distribution */}
            <div className="rounded-xl border border-olive-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-olive-800 mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Hourly Distribution (Today)
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7d5" />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#6b7280" }} interval={2} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4d8c0", fontSize: 12 }} />
                  <Bar dataKey="requests" fill="#7a8450" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Latency over time */}
          <div className="rounded-xl border border-olive-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-olive-800 mb-4">Average Latency (ms)</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyUsage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7d5" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} domain={[100, 400]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #d4d8c0", fontSize: 12 }} />
                <Line type="monotone" dataKey="latency" stroke="#9cad60" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ═══════════════════ Tab: Endpoints ═══════════════════ */}
      {activeTab === "endpoints" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-olive-200 bg-white p-6 mb-4">
            <h3 className="text-sm font-semibold text-olive-800 mb-2">Base URL</h3>
            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-olive-100 px-3 py-1.5 text-sm font-mono text-olive-800">
                https://api.vaidyavision.com/v1
              </code>
              <button
                onClick={() => copyToClipboard("https://api.vaidyavision.com/v1", "base-url")}
                className="text-sage-400 hover:text-olive-600 transition-colors"
              >
                {copiedKey === "base-url" ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-sage-500 mt-2">All endpoints require a valid API key via the <code className="text-olive-600">Authorization: Bearer</code> header.</p>
          </div>

          {ENDPOINTS.map((ep, idx) => (
            <div key={idx} className="rounded-xl border border-olive-200 bg-white overflow-hidden">
              <button
                onClick={() => setExpandedEndpoint(expandedEndpoint === idx ? null : idx)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-olive-50/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    ep.method === "POST" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                  }`}>
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-olive-800">{ep.path}</code>
                  <span className="text-sm text-sage-500">— {ep.desc}</span>
                </div>
                {expandedEndpoint === idx ? <ChevronUp className="h-4 w-4 text-sage-400" /> : <ChevronDown className="h-4 w-4 text-sage-400" />}
              </button>

              {expandedEndpoint === idx && (
                <div className="border-t border-olive-100 px-6 py-5 space-y-5">
                  {/* Parameters */}
                  <div>
                    <h4 className="text-xs font-semibold text-sage-500 uppercase tracking-wider mb-2">Parameters</h4>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-sage-400 border-b border-olive-100">
                          <th className="pb-2 pr-4">Name</th>
                          <th className="pb-2 pr-4">Type</th>
                          <th className="pb-2 pr-4">Required</th>
                          <th className="pb-2">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-olive-50">
                        {ep.params.map((p) => (
                          <tr key={p.name}>
                            <td className="py-2 pr-4 font-mono text-olive-700">{p.name}</td>
                            <td className="py-2 pr-4 text-sage-600">{p.type}</td>
                            <td className="py-2 pr-4">{p.required ? <Check className="h-3.5 w-3.5 text-green-500" /> : <span className="text-sage-400">—</span>}</td>
                            <td className="py-2 text-sage-600">{p.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Response */}
                  <div>
                    <h4 className="text-xs font-semibold text-sage-500 uppercase tracking-wider mb-2">Response</h4>
                    <pre className="rounded-lg bg-zinc-900 p-4 text-xs text-emerald-300 font-mono overflow-x-auto">
                      {ep.response}
                    </pre>
                  </div>

                  {/* Code examples */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-xs font-semibold text-sage-500 uppercase tracking-wider">Code Examples</h4>
                      <div className="flex gap-1 ml-2">
                        {(["curl", "python", "node"] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setCodeTab(t)}
                            className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
                              codeTab === t ? "bg-olive-200 text-olive-800" : "text-sage-500 hover:bg-olive-100"
                            }`}
                          >
                            {t === "curl" ? "cURL" : t === "python" ? "Python" : "Node.js"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="relative">
                      <pre className="rounded-lg bg-zinc-900 p-4 text-xs text-emerald-300 font-mono overflow-x-auto">
                        {ep[codeTab]}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(ep[codeTab], `code-${idx}-${codeTab}`)}
                        className="absolute top-2 right-2 rounded-md bg-zinc-800 p-1.5 text-zinc-300 hover:text-white transition-colors"
                      >
                        {copiedKey === `code-${idx}-${codeTab}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════ Tab: Billing ═══════════════════ */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Current plan */}
          <div className="rounded-xl border-2 border-olive-300 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <currentPlan.icon className="h-5 w-5 text-olive-600" />
                  <h3 className="text-lg font-bold text-olive-800">{currentPlan.name} Plan</h3>
                  {currentPlan.popular && (
                    <span className="rounded-full bg-olive-100 px-2 py-0.5 text-xs font-medium text-olive-700">Popular</span>
                  )}
                </div>
                <p className="text-sage-600 text-sm">{currentPlan.description}</p>
                <div className="mt-3 flex gap-4 text-sm text-sage-600">
                  <span>{currentPlan.requestsPerDay} req/day</span>
                  <span>•</span>
                  <span>{currentPlan.maxKeys} keys</span>
                  <span>•</span>
                  <span>{currentPlan.rateLimit} rate limit</span>
                </div>
                <p className="mt-2 text-xs text-olive-600 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Limits automatically expand as your usage grows
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-olive-800">
                  ₹{currentPlan.price}
                  <span className="text-base font-normal text-sage-500">{currentPlan.period !== "forever" ? currentPlan.period : ""}</span>
                </p>
                <button
                  onClick={() => setShowPricingModal(true)}
                  className="mt-2 text-sm text-olive-600 hover:text-olive-800 hover:underline transition-colors"
                >
                  Change plan →
                </button>
              </div>
            </div>
          </div>

          {/* Cost breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-xl border border-olive-200 bg-white p-5">
              <p className="text-xs font-medium text-sage-500 mb-1">Base Subscription</p>
              <p className="text-2xl font-bold text-olive-800">₹{currentPlan.price.toFixed(2)}</p>
              <p className="text-xs text-sage-500 mt-1">Billed monthly</p>
            </div>
            <div className="rounded-xl border border-olive-200 bg-white p-5">
              <p className="text-xs font-medium text-sage-500 mb-1">Overage This Month</p>
              <p className="text-2xl font-bold text-olive-800">₹{(overageCost * 30).toFixed(2)}</p>
              <p className="text-xs text-sage-500 mt-1">@ ₹{OVERAGE_RATE}/request</p>
            </div>
            <div className="rounded-xl border border-olive-200 bg-white p-5">
              <p className="text-xs font-medium text-sage-500 mb-1">Estimated Total</p>
              <p className="text-2xl font-bold text-olive-800">₹{(currentPlan.price + overageCost * 30).toFixed(2)}</p>
              <p className="text-xs text-sage-500 mt-1">For this billing cycle</p>
            </div>
          </div>

          {/* Payment method */}
          <div className="rounded-xl border border-olive-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-olive-800 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Method
            </h3>
            <div className="flex items-center justify-between rounded-lg bg-olive-50 p-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-12 rounded bg-gradient-to-r from-olive-600 to-olive-800 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-olive-800">•••• •••• •••• 4242</p>
                  <p className="text-xs text-sage-500">Expires 12/27</p>
                </div>
              </div>
              <button className="text-sm text-olive-600 hover:underline">Update</button>
            </div>
          </div>

          {/* Invoice history */}
          <div className="rounded-xl border border-olive-200 bg-white overflow-hidden">
            <div className="border-b border-olive-100 bg-olive-50/50 px-6 py-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-olive-600" />
              <h3 className="text-sm font-semibold text-olive-800">Invoice History</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-olive-100 text-left text-xs font-medium text-sage-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Invoice</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Description</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-olive-50">
                {DUMMY_INVOICES.map((inv) => (
                  <tr key={inv.id} className="hover:bg-olive-50/30 transition-colors">
                    <td className="px-6 py-3 font-mono text-xs text-olive-700">{inv.id}</td>
                    <td className="px-6 py-3 text-sage-600">{new Date(inv.date).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-olive-700">{inv.description}</td>
                    <td className="px-6 py-3 text-sage-600">{inv.plan}</td>
                    <td className="px-6 py-3 font-medium text-olive-800">₹{inv.amount.toFixed(2)}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        inv.status === "paid" ? "bg-green-100 text-green-700" :
                        inv.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════ Modal: Create Key ═══════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-olive-800 flex items-center gap-2">
                <Key className="h-5 w-5 text-olive-600" />
                Create New API Key
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-sage-400 hover:text-sage-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-olive-700 mb-1">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Production Server, Mobile App..."
                  className="w-full rounded-xl border border-olive-200 bg-cream-50 px-4 py-2.5 text-sm text-olive-800 outline-none focus:border-olive-400 focus:ring-2 focus:ring-olive-200"
                />
              </div>

              {/* Environment */}
              <div>
                <label className="block text-sm font-medium text-olive-700 mb-1">Environment</label>
                <div className="grid grid-cols-2 gap-3">
                  {(["test", "live"] as const).map((env) => (
                    <button
                      key={env}
                      onClick={() => setNewKeyEnv(env)}
                      className={`flex items-center gap-2 rounded-xl border-2 p-3 text-sm transition-all ${
                        newKeyEnv === env
                          ? env === "live"
                            ? "border-green-400 bg-green-50 text-green-700"
                            : "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-olive-200 bg-white text-sage-600 hover:border-olive-300"
                      }`}
                    >
                      <span className={`h-2 w-2 rounded-full ${env === "live" ? "bg-green-500" : "bg-amber-500"}`} />
                      {env === "live" ? "Live" : "Test"}
                      <span className="text-xs opacity-60">
                        {env === "live" ? "(production traffic)" : "(safe for testing)"}
                      </span>
                    </button>
                  ))}
                </div>
                {newKeyEnv === "live" && (
                  <p className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Live keys have lower rate limits and count toward your billing quota
                  </p>
                )}
              </div>

              {/* Scopes */}
              <div>
                <label className="block text-sm font-medium text-olive-700 mb-1">Scopes</label>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_SCOPES.map((scope) => (
                    <button
                      key={scope.id}
                      onClick={() =>
                        setSelectedScopes((prev) =>
                          prev.includes(scope.id)
                            ? prev.filter((s) => s !== scope.id)
                            : [...prev, scope.id]
                        )
                      }
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm transition-all ${
                        selectedScopes.includes(scope.id)
                          ? "border-olive-400 bg-olive-50 text-olive-700"
                          : "border-olive-200 text-sage-500 hover:border-olive-300"
                      }`}
                    >
                      <scope.icon className="h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium text-xs">{scope.label}</p>
                        <p className="text-xs opacity-60">{scope.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-olive-200 px-4 py-2 text-sm font-medium text-sage-600 hover:bg-olive-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || selectedScopes.length === 0 || creating}
                className="flex items-center gap-2 rounded-xl bg-olive-600 px-5 py-2 text-sm font-medium text-white hover:bg-olive-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ Modal: Reveal Key ═══════════════════ */}
      {revealedFullKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <h2 className="text-lg font-bold text-olive-800">API Key Created!</h2>
            </div>

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Copy your key now</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    This is the only time you&apos;ll see the full key. Store it securely — we cannot retrieve it later.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <pre className="rounded-xl bg-zinc-900 p-4 text-sm text-emerald-300 font-mono break-all whitespace-pre-wrap pr-12">
                {revealedFullKey}
              </pre>
              <button
                onClick={() => copyToClipboard(revealedFullKey, "new-key")}
                className="absolute top-3 right-3 rounded-lg bg-olive-700 p-2 text-olive-200 hover:text-white hover:bg-olive-600 transition-colors"
              >
                {copiedKey === "new-key" ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setRevealedFullKey(null)}
                className="rounded-xl bg-olive-600 px-5 py-2 text-sm font-medium text-white hover:bg-olive-700 transition-colors"
              >
                I&apos;ve Saved My Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ Modal: Revoke Confirm ═══════════════════ */}
      {revokeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <h2 className="text-lg font-bold text-olive-800">Revoke API Key?</h2>
            </div>
            <p className="text-sm text-sage-600 mb-1">
              You&apos;re about to permanently revoke:
            </p>
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
              <p className="font-medium text-sm text-red-800">{revokeTarget.name}</p>
              <code className="text-xs font-mono text-red-600">{revokeTarget.key}</code>
            </div>
            <p className="text-xs text-sage-500 mb-5">
              Any application using this key will immediately lose access. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRevokeTarget(null)}
                className="rounded-xl border border-olive-200 px-4 py-2 text-sm font-medium text-sage-600 hover:bg-olive-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeKey}
                disabled={revoking}
                className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Revoke Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ Modal: Pricing Plans ═══════════════════ */}
      {showPricingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-8 shadow-2xl mx-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-olive-800">Choose Your Plan</h2>
                <p className="text-sm text-sage-600 mt-1">Scale your SaMD integration with the right tier</p>
              </div>
              <button onClick={() => setShowPricingModal(false)} className="text-sage-400 hover:text-sage-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-olive-50 border border-olive-200 p-3 mb-5 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-olive-600 shrink-0" />
              <p className="text-sm text-olive-700">
                <span className="font-semibold">Limits grow with you</span> — As your usage increases, rate limits and daily quotas automatically expand. All prices in <span className="font-semibold">₹ (INR)</span>.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-5">
              {PRICING_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border-2 p-6 transition-all hover:shadow-lg ${
                    plan.popular
                      ? "border-olive-500 bg-olive-50/30 shadow-md"
                      : currentPlan.id === plan.id
                      ? "border-olive-300 bg-olive-50/20"
                      : "border-olive-200 bg-white"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-olive-600 px-3 py-1 text-xs font-semibold text-white flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <plan.icon className="h-8 w-8 text-olive-600 mb-2" />
                    <h3 className="text-lg font-bold text-olive-800">{plan.name}</h3>
                    <p className="text-xs text-sage-500 mt-1">{plan.description}</p>
                  </div>

                  <div className="mb-5">
                    <span className="text-4xl font-bold text-olive-800">₹{plan.price}</span>
                    <span className="text-sage-500 text-sm">{plan.period !== "forever" ? plan.period : ""}</span>
                    {plan.price === 0 && <span className="text-sage-500 text-sm ml-1">free forever</span>}
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-sage-700">
                        <Check className="h-4 w-4 text-olive-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelectPlan(plan)}
                    className={`w-full rounded-xl py-2.5 text-sm font-medium transition-colors ${
                      currentPlan.id === plan.id
                        ? "bg-olive-100 text-olive-600 cursor-default"
                        : plan.popular
                        ? "bg-olive-600 text-white hover:bg-olive-700"
                        : "border border-olive-300 text-olive-700 hover:bg-olive-50"
                    }`}
                    disabled={currentPlan.id === plan.id}
                  >
                    {currentPlan.id === plan.id ? "Current Plan" : plan.price === 0 ? "Downgrade" : "Upgrade"}
                    {currentPlan.id !== plan.id && <ArrowRight className="h-3.5 w-3.5 inline ml-1" />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ Modal: Payment ═══════════════════ */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4 animate-in fade-in zoom-in-95 duration-200">
            {paymentSuccess ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-olive-800 mb-1">Payment Successful!</h2>
                <p className="text-sm text-sage-600">
                  You&apos;re now on the {selectedPlan.name} plan
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold text-olive-800 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-olive-600" />
                    Payment Details
                  </h2>
                  <button onClick={() => setShowPaymentModal(false)} className="text-sage-400 hover:text-sage-600 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Plan summary */}
                <div className="rounded-xl bg-olive-50 border border-olive-200 p-4 mb-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-olive-800">{selectedPlan.name} Plan</p>
                      <p className="text-xs text-sage-500">{selectedPlan.requestsPerDay} requests/day</p>
                    </div>
                    <p className="text-2xl font-bold text-olive-800">
                      ₹{selectedPlan.price}<span className="text-sm font-normal text-sage-500">/mo</span>
                    </p>
                  </div>
                </div>

                {/* Card form */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-olive-700 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full rounded-xl border border-olive-200 bg-cream-50 px-4 py-2.5 text-sm text-olive-800 outline-none focus:border-olive-400 focus:ring-2 focus:ring-olive-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-olive-700 mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4242 4242 4242 4242"
                      maxLength={19}
                      className="w-full rounded-xl border border-olive-200 bg-cream-50 px-4 py-2.5 text-sm text-olive-800 outline-none focus:border-olive-400 focus:ring-2 focus:ring-olive-200 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-olive-700 mb-1">Expiry</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full rounded-xl border border-olive-200 bg-cream-50 px-4 py-2.5 text-sm text-olive-800 outline-none focus:border-olive-400 focus:ring-2 focus:ring-olive-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-olive-700 mb-1">CVC</label>
                      <input
                        type="text"
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className="w-full rounded-xl border border-olive-200 bg-cream-50 px-4 py-2.5 text-sm text-olive-800 outline-none focus:border-olive-400 focus:ring-2 focus:ring-olive-200 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-1 text-xs text-sage-400">
                  <Lock className="h-3 w-3" />
                  Secured with 256-bit SSL encryption. This is a simulated payment.
                </div>

                <div className="mt-5 flex gap-3 justify-end">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="rounded-xl border border-olive-200 px-4 py-2 text-sm font-medium text-sage-600 hover:bg-olive-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={paymentProcessing || !cardName || cardNumber.length < 19 || cardExpiry.length < 5 || cardCvc.length < 3}
                    className="flex items-center gap-2 rounded-xl bg-olive-600 px-5 py-2 text-sm font-medium text-white hover:bg-olive-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {paymentProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4" />
                        Pay ₹{selectedPlan.price}/mo
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}