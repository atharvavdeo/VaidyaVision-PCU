
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { age, sex, diagnosis, findings } = await req.json();

        const prompt = `
        Act as a senior specialist doctor. Create a personalized treatment plan for a patient with the following details:
        - Age: ${age || "Unknown"}
        - Sex: ${sex || "Unknown"}
        - Diagnosis: ${diagnosis}
        - Key Findings: ${findings || "See scan"}
        
        Return the response in strictly valid JSON format with this structure:
        {
            "treatment_plan": {
                "urgency_level": "IMMEDIATE" | "HIGH" | "MODERATE" | "LOW",
                "medications": ["list", "of", "meds"],
                "tests": ["follow-up tests"],
                "referrals": ["specialist referrals"],
                "lifestyle": ["lifestyle changes"],
                "contraindications": ["warnings"]
            }
        }
        `;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const content = JSON.parse(data.choices[0].message.content);

        return NextResponse.json(content);
    } catch (error) {
        console.error("Groq Treatment Error:", error);
        return NextResponse.json({ error: "Failed to generate treatment plan" }, { status: 500 });
    }
}
