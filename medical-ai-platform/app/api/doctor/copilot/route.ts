import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireRoles } from "@/lib/api-auth";
import { getPatientContext, resolvePatient } from "@/lib/doctor-copilot/getPatientContext";
import { parseSummaryRequest } from "@/lib/doctor-copilot/parseRequest";
import { summarizePatientContext } from "@/lib/doctor-copilot/summarizePatientContext";

export async function POST(req: NextRequest) {
    try {
        const user = await getAuthUser();
        if (!user) {
            return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const forbidden = requireRoles(user, ["doctor"]);
        if (forbidden) {
            return forbidden;
        }

        const body = await req.json();
        const message = String(body?.message || "").trim();

        if (!message) {
            return NextResponse.json(
                { ok: false, error: "message is required" },
                { status: 400 }
            );
        }

        const parsed = await parseSummaryRequest(message);

        if (parsed.request.askClarifyingQuestion && !parsed.request.patientRef?.name) {
            return NextResponse.json({
                ok: false,
                needsClarification: true,
                question: "Which patient should I summarize? Please provide the full name.",
                request: parsed.request,
            });
        }

        const resolved = await resolvePatient(parsed.request);

        if (!resolved.ok && resolved.code === "AMBIGUOUS") {
            return NextResponse.json({
                ok: false,
                needsClarification: true,
                question: resolved.message,
                candidates: resolved.candidates,
                request: parsed.request,
            });
        }

        if (!resolved.ok && resolved.code === "NOT_FOUND") {
            return NextResponse.json(
                {
                    ok: false,
                    error: resolved.message,
                    request: parsed.request,
                },
                { status: 404 }
            );
        }

        const context = await getPatientContext(resolved.patient.id, parsed.request);
        const summaryResult = await summarizePatientContext(parsed.request, context);

        return NextResponse.json({
            ok: true,
            request: parsed.request,
            parserNotes: parsed.parserNotes,
            resolvedPatient: {
                id: resolved.patient.id,
                name: resolved.patient.name,
                email: resolved.patient.email,
            },
            summary: summaryResult.summary,
            sections: summaryResult.sections,
            risks: summaryResult.risks,
            pendingItems: summaryResult.pendingItems,
            sourcesUsed: {
                scans: context.scans.length,
                reports: context.reports.length,
                prescriptions: context.prescriptions.length,
                medications: context.medications.length,
                appointments: context.appointments.length,
                cases: context.cases.length,
                artifacts: context.artifacts.length,
                caseReports: context.caseReports.length,
                notes: context.notes.length,
                messages: context.messages.length,
                voiceNotes: context.voiceNotes.length,
            },
        });
    } catch (error) {
        console.error("[/api/doctor/copilot] Error:", error);
        return NextResponse.json(
            { ok: false, error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
