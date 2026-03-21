
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const { modality, diagnosis, findings, language = "en" } = await req.json();

        // Try to load a matching template from the DB
        let templateStructure = "";
        try {
            // Map modality to template name prefix
            const modalityTemplateMap: Record<string, string> = {
                brain: "Brain MRI Report",
                lung: "Chest X-Ray / Lung Report",
                skin: "Skin Lesion Dermoscopy Report",
                ecg: "ECG / Cardiology Report",
            };

            // First try language-specific template
            let templateName = modalityTemplateMap[modality] || "Brain MRI Report";
            if (language !== "en") {
                // Try language-specific template first
                const langTemplate = await db.query.templates.findFirst({
                    where: (t, { and, eq, like }) => and(
                        like(t.name, `%${modality}%`),
                        eq(t.language, language)
                    ),
                });
                if (langTemplate) {
                    const parsed = JSON.parse(langTemplate.structureJson);
                    templateStructure = `\nUse this report template structure:\nTitle: ${parsed.title}\nSections:\n${parsed.sections.map((s: any) => `- ${s.heading}: ${s.placeholder}`).join("\n")}`;
                }
            }

            if (!templateStructure) {
                const template = await db.query.templates.findFirst({
                    where: eq(templates.name, templateName),
                });
                if (template) {
                    const parsed = JSON.parse(template.structureJson);
                    templateStructure = `\nUse this report template structure:\nTitle: ${parsed.title}\nSections:\n${parsed.sections.map((s: any) => `- ${s.heading}: ${s.placeholder}`).join("\n")}`;
                }
            }
        } catch (templateErr) {
            console.error("Template lookup error (non-fatal):", templateErr);
        }

        const prompt = `
        Act as a radiologist. Write a formal medical report for a ${modality} scan.
        Diagnosis: ${diagnosis}
        Findings: ${findings}
        ${templateStructure}
        
        Output Language: ${language} (Translate the report content fully).
        
        Return the response in strictly valid JSON format with a "report" field containing the full text report string.
        Example: { "report": "Patient Name: ... \\n Modality: ... \\n Findings: ..." }
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
                temperature: 0.2,
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const content = JSON.parse(data.choices[0].message.content);

        return NextResponse.json(content);
    } catch (error) {
        console.error("Groq Report Error:", error);
        return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
    }
}
