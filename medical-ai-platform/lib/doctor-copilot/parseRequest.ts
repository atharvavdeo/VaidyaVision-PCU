import { ParsedSummaryRequest, SummaryInclude, SummaryIntent, SummaryRequest } from "./types";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const DEFAULT_INCLUDE: SummaryInclude[] = [
    "profile",
    "scans",
    "reports",
    "prescriptions",
    "medications",
    "appointments",
    "notes",
];

function safeJsonParse(text: string): Record<string, any> | null {
    try {
        return JSON.parse(text);
    } catch {
        const first = text.indexOf("{");
        const last = text.lastIndexOf("}");
        if (first !== -1 && last !== -1 && last > first) {
            try {
                return JSON.parse(text.slice(first, last + 1));
            } catch {
                return null;
            }
        }
        return null;
    }
}

function inferIntent(message: string): SummaryIntent {
    const lower = message.toLowerCase();
    if (lower.includes("timeline")) return "timeline";
    if (lower.includes("scan")) return "scans";
    if (lower.includes("report")) return "reports";
    if (lower.includes("prescription")) return "prescriptions";
    if (lower.includes("medication") || lower.includes("medicine")) return "medications";
    if (lower.includes("appointment") || lower.includes("follow-up")) return "appointments";
    if (lower.includes("note")) return "notes";
    if (lower.includes("latest") || lower.includes("changed") || lower.includes("update")) return "latest_updates";
    return "full_brief";
}

function inferDays(message: string): number | undefined {
    const lower = message.toLowerCase();
    const match = lower.match(/last\s+(\d+)\s+day/);
    if (match) return Number(match[1]);
    if (lower.includes("last week") || lower.includes("7 day")) return 7;
    if (lower.includes("last month") || lower.includes("30 day")) return 30;
    return undefined;
}

function inferName(message: string): string | undefined {
    const cleaned = message
        .replace(/give me|summari[sz]e|what changed|for|patient|brief|full|latest|updates|in the|last|days|scans|reports|prescriptions|and|appointments/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!cleaned) return undefined;
    if (cleaned.length < 3) return undefined;
    return cleaned;
}

function normalizeRequest(raw: Record<string, any>, fallbackMessage: string): SummaryRequest {
    const request: SummaryRequest = {
        patientRef: {
            id: typeof raw?.patientRef?.id === "number" ? raw.patientRef.id : undefined,
            name: typeof raw?.patientRef?.name === "string" ? raw.patientRef.name.trim() : undefined,
            email: typeof raw?.patientRef?.email === "string" ? raw.patientRef.email.trim().toLowerCase() : undefined,
            phone: typeof raw?.patientRef?.phone === "string" ? raw.patientRef.phone.trim() : undefined,
            mrn: typeof raw?.patientRef?.mrn === "string" ? raw.patientRef.mrn.trim() : undefined,
        },
        intent: (raw?.intent as SummaryIntent) || inferIntent(fallbackMessage),
        include: Array.isArray(raw?.include) && raw.include.length > 0 ? raw.include : DEFAULT_INCLUDE,
        timeframe: raw?.timeframe,
        askClarifyingQuestion: Boolean(raw?.askClarifyingQuestion),
    };

    if (!request.patientRef.name && !request.patientRef.email && !request.patientRef.phone && !request.patientRef.id) {
        request.patientRef.name = inferName(fallbackMessage);
    }

    const inferredDays = inferDays(fallbackMessage);
    if (!request.timeframe && inferredDays) {
        request.timeframe = { days: inferredDays };
    }

    return request;
}

export async function parseSummaryRequest(message: string): Promise<ParsedSummaryRequest> {
    const trimmed = message.trim();

    if (!GROQ_API_KEY) {
        return {
            request: normalizeRequest({}, trimmed),
            parserNotes: "GROQ_API_KEY not set, using heuristic parser.",
        };
    }

    const systemPrompt = `You convert a doctor's free-text request into strict JSON.
Return ONLY JSON with this shape:
{
  "patientRef": { "id": number?, "name": string?, "email": string?, "phone": string?, "mrn": string? },
  "intent": "full_brief" | "latest_updates" | "timeline" | "scans" | "reports" | "prescriptions" | "medications" | "appointments" | "notes",
  "include": ["profile"|"scans"|"reports"|"prescriptions"|"medications"|"appointments"|"cases"|"artifacts"|"notes"|"messages"|"voice_notes"],
  "timeframe": { "from": string?, "to": string?, "days": number? }?,
  "askClarifyingQuestion": boolean
}
Rules:
- Prefer patientRef.name when a human name is present.
- If no patient identifier is present, set askClarifyingQuestion=true.
- Use include array that matches doctor ask; default to full brief set for broad asks.
- Return no markdown and no explanation.`;

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            temperature: 0.1,
            max_tokens: 350,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: trimmed },
            ],
        }),
    });

    if (!res.ok) {
        return {
            request: normalizeRequest({}, trimmed),
            parserNotes: `Parser model failed with status ${res.status}, using heuristic parser.`,
        };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    const parsed = safeJsonParse(content);

    if (!parsed) {
        return {
            request: normalizeRequest({}, trimmed),
            parserNotes: "Parser response was not valid JSON, using heuristic parser.",
        };
    }

    return {
        request: normalizeRequest(parsed, trimmed),
    };
}
