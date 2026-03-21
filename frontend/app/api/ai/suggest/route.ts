import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// POST /api/ai/suggest — Get AI-powered reply suggestions
export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!GROQ_API_KEY) {
            return NextResponse.json({ error: "Groq API not configured" }, { status: 503 });
        }

        const body = await req.json();
        const { messages, context } = body;

        // Build prompt
        const systemPrompt = `You are an AI assistant helping in a medical consultation between a doctor and patient on VaidyaVision, a medical imaging platform.
    
${context ? `Context: ${context}` : ""}

Based on the conversation, suggest 3 helpful, professional reply options. Each should be concise (1-2 sentences). Return only a JSON array of 3 strings.

Example: ["I recommend scheduling a follow-up scan in 2 weeks.", "The results look normal, but let me review the heatmap more closely.", "Could you describe when the symptoms first appeared?"]`;

        const chatMessages = [
            { role: "system", content: systemPrompt },
            ...messages.slice(-6).map((m: any) => ({
                role: m.isCurrentUser ? "user" : "assistant",
                content: m.content,
            })),
            { role: "user", content: "Suggest 3 reply options:" },
        ];

        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: chatMessages,
                temperature: 0.7,
                max_tokens: 300,
            }),
        });

        if (!groqRes.ok) {
            throw new Error(`Groq API error: ${groqRes.status}`);
        }

        const data = await groqRes.json();
        const content = data.choices?.[0]?.message?.content || "[]";

        // Parse suggestions
        let suggestions: string[];
        try {
            suggestions = JSON.parse(content);
        } catch {
            // Try to extract from text
            suggestions = content
                .split("\n")
                .filter((l: string) => l.trim())
                .slice(0, 3)
                .map((l: string) => l.replace(/^\d+[\.\)]\s*"?|"?\s*$/g, ""));
        }

        return NextResponse.json({ suggestions: suggestions.slice(0, 3) });
    } catch (error) {
        console.error("[/api/ai/suggest] Error:", error);
        return NextResponse.json({
            suggestions: [
                "Could you provide more details about your symptoms?",
                "I'll review the scan results and get back to you shortly.",
                "Let's schedule a follow-up appointment to discuss this further."
            ]
        });
    }
}
