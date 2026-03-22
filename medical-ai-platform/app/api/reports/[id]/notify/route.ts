import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { reports, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // 1. Auth: doctor-only
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: eq(users.clerkId, userId),
        });
        
        if (!user || user.role !== "doctor") {
            return NextResponse.json({ error: "Doctor access only" }, { status: 403 });
        }

        // 2. Load report with relations
        const reportId = parseInt(params.id);
        if (isNaN(reportId)) {
            return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
        }

        const report = await db.query.reports.findFirst({
            where: eq(reports.id, reportId),
            with: { 
                patient: true, 
                scan: true,
                doctor: {
                    with: { doctorProfile: true }
                },
                hospitalTemplate: true
            },
        });

        if (!report) {
            return NextResponse.json({ error: "Report not found" }, { status: 404 });
        }

        // 3. Verify ownership
        if (report.doctorId !== user.id) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // 4. Ensure PDF exists
        let pdfUrl = report.pdfUrl;
        if (!pdfUrl) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
            const pdfRes = await fetch(`${appUrl}/api/reports/${reportId}/pdf`, {
                headers: { Cookie: req.headers.get("cookie") || "" },
            });
            if (!pdfRes.ok) {
                return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
            }
            pdfUrl = `/generated-reports/report-${reportId}.pdf`;
        }

        // 5. Update releasedAt if not already released
        const now = new Date();
        if (!report.releasedAt) {
            await db.update(reports).set({
                releasedAt: now,
                pdfUrl,
            }).where(eq(reports.id, reportId));
        }

        // 5.5 Construct Internal URLs
        const appDomain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const absolutePdfUrl = pdfUrl.startsWith("http") ? pdfUrl : `${appDomain}${pdfUrl}`;
        const localReportUrl = `${appDomain}/patient/reports/${reportId}`;

        // 6. Generate Summary via Groq natively
        let summary = "Your medical report is now available for review.";
        try {
            const Groq = (await import("groq-sdk")).default;
            if (process.env.GROQ_API_KEY) {
                const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
                
                const reportTextChunk = [
                    report.diagnosis ? `Diagnosis: ${report.diagnosis}` : "",
                    report.findings ? `Findings: ${report.findings}` : "",
                    report.recommendations ? `Recommendations: ${report.recommendations}` : ""
                ].filter(Boolean).join("\n\n");

                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are a cautious medical assistant generating summaries for patients. STRICT RULES: Only use the provided report text. Do NOT add new information. Do NOT guess or infer. Do NOT provide diagnosis or treatment advice. Avoid alarming language. Keep tone calm, neutral, and easy to understand. If data is unclear, say so instead of guessing. OUTPUT FORMAT: 2 to 4 short sentences. Simple language (non-technical). Highlight only key observations. No bullet points. No medical jargon unless unavoidable.",
                        },
                        {
                            role: "user",
                            content: `Summarize this medical report safely:\n\n${reportTextChunk}`,
                        },
                    ],
                    model: "llama-3.1-8b-instant",
                });
                summary = chatCompletion.choices[0]?.message?.content || summary;
            } else {
                console.warn("[Notify] GROQ_API_KEY missing - skipping AI summary generation.");
            }
        } catch (error) {
            console.error("[Groq] Summary generation failed:", error);
        }

        // 7. Dispatch Email
        let emailStatus: "sent" | "failed" = "failed";
        let emailError = "";
        let emailMessageId: string | null = null;
        try {
            const { sendViaGmail } = await import("@/lib/integrations/sendViaGmail");
            const doctorName = report.doctor?.name || "Your Doctor";
            const patientName = report.patient?.name || "Patient";
            
            const html = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Medical Report Released</h2>
                    <p>Dear ${patientName},</p>
                    <p>Dr. ${doctorName} has released your medical report. You can view the details securely on the VaidyaVision portal.</p>
                    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                        <strong>Report Summary:</strong><br/>
                        ${summary}
                    </div>
                    <a href="${localReportUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">View Full Report</a>
                </div>
            `;
            
            const emailResult = await sendViaGmail({
                doctorUserId: user.id,
                to: report.patient.email,
                subject: "Your Medical Report is Ready",
                htmlBody: html,
            });
            if (emailResult.success) {
                emailStatus = "sent";
                emailMessageId = emailResult.messageId || null;
            } else {
                emailError = emailResult.error || "Unknown Gmail error";
            }
        } catch (error) {
            emailError = String(error);
        }

        // Insert Email Delivery Job
        const { reportDeliveries, conversations } = await import("@/lib/db/schema");
        await db.insert(reportDeliveries).values({
            reportId: report.id,
            channel: "email",
            provider: "gmail",
            status: emailStatus,
            providerMessageSid: emailMessageId,
            externalId: emailMessageId,
            sentAt: emailStatus === "sent" ? new Date() : null,
            errorMessage: emailError || null,
        });

        // 8. Dispatch Twilio WhatsApp
        let waStatus: "sent" | "failed" = "failed";
        let waError = "";
        try {
            const twilioPhone = report.patient?.phone;
            if (twilioPhone && process.env.TWILIO_ACCOUNT_SID) {
                const twilio = (await import("twilio")).default;
                const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                
                // Check if in session
                const existingConv = await db.query.conversations.findFirst({
                    where: eq(conversations.patientId, report.patientId)
                });
                
                const ONE_DAY_MS = 24 * 60 * 60 * 1000;
                const isInSession = existingConv?.lastMessageAt && (now.getTime() - existingConv.lastMessageAt.getTime() < ONE_DAY_MS);

                const fromNumber = process.env.TWILIO_FROM_NUMBER || "+12602869523";
                const toNumber = twilioPhone.startsWith("+") ? twilioPhone : "+" + twilioPhone;
                
                let messageConfig: any = {
                    from: fromNumber,
                    to: toNumber,
                    statusCallback: `${appDomain}/api/webhooks/twilio/status`,
                };

                const { randomBytes } = await import("crypto");
                const intentToken = randomBytes(6).toString("hex").toUpperCase();
                
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + 2);

                if (isInSession) {
                    messageConfig.body = `Hello ${report.patient?.name},\n\nDr. ${report.doctor?.name} has released your medical report.\n\nSummary:\n${summary}\n\nView securely here: ${localReportUrl}\n\nReply with "BOOK ${intentToken}" to schedule a follow-up consultation.`;
                } else {
                    // SMS does not require approved templates, generic text is fine
                    messageConfig.body = `Your medical report from VaidyaVision is ready. View it here: ${localReportUrl} . To book a follow-up, reply with "BOOK ${intentToken}"`;
                }

                const msg = await client.messages.create(messageConfig);
                waStatus = "sent";
                
                // Insert WA Delivery Job
                const { reportDeliveries: rdSchema, appointmentIntents: aiSchema } = await import("@/lib/db/schema");
                const [delivery] = await db.insert(rdSchema).values({
                    reportId: report.id,
                    channel: "whatsapp",
                    provider: "twilio_whatsapp",
                    status: waStatus,
                    externalId: msg.sid,
                    providerMessageSid: msg.sid,
                    sentAt: new Date(),
                    errorMessage: null,
                }).returning({ id: rdSchema.id });
                
                // Persist the explicit Appointment Intent Token
                await db.insert(aiSchema).values({
                    patientId: report.patientId,
                    doctorId: report.doctorId,
                    reportId: report.id,
                    deliveryId: delivery.id,
                    intentToken: intentToken,
                    expiresAt: expiresAt,
                    status: "pending"
                });
                
            } else {
                waError = "Missing Patient Phone or Twilio SID";
                await db.insert(reportDeliveries).values({
                    reportId: report.id,
                    channel: "whatsapp",
                    provider: "twilio_whatsapp",
                    status: "failed",
                    errorMessage: waError,
                });
            }
        } catch (error) {
            waError = String(error);
            await db.insert(reportDeliveries).values({
                reportId: report.id,
                channel: "sms",
                provider: "twilio_sms",
                status: "failed",
                errorMessage: waError,
            });
        }

        // 9. Update master delivery status in DB (legacy field fallback)
        const finalStatus = emailStatus === "sent" || waStatus === "sent" ? "sent" : "failed";
        await db.update(reports).set({ deliveryStatus: finalStatus }).where(eq(reports.id, reportId));

        return NextResponse.json({
            notified: true,
            deliveryStatus: finalStatus,
            emailStatus,
            waStatus,
            pdfUrl,
            releasedAt: report.releasedAt || now,
        });

    } catch (error) {
        console.error("[/api/reports/[id]/notify] Error:", error);
        return NextResponse.json({ error: "Notification failed", detail: String(error) }, { status: 500 });
    }
}
