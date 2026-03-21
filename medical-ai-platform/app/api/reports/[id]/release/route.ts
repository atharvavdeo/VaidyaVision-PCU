import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { reports, users, emailConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { readFile } from "fs/promises";
import path from "path";

/**
 * PR7 — Centralized release orchestration.
 * 
 * Decision flow:
 * 1. Doctor releases report
 * 2. Ensure PDF exists (generate if missing)
 * 3. Set `releasedAt` — patient can now view in-app regardless of email delivery
 * 4. Attempt email delivery:
 *    - If Gmail active AND body.sendMode === "gmail" → send via Gmail
 *    - Otherwise → send via Resend (platform email)
 * 5. No automatic fallback: if chosen provider fails, status = "failed"
 * 6. Patient access is based on releasedAt, not email success
 */
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

        // Parse optional body (sendMode: "gmail" | "resend")
        let sendMode: "gmail" | "resend" = "resend";
        try {
            const body = await req.json();
            if (body?.sendMode === "gmail") sendMode = "gmail";
        } catch {
            // No body or invalid JSON — default to Resend
        }

        // 2. Load report
        const reportId = parseInt(params.id);
        if (isNaN(reportId)) {
            return NextResponse.json({ error: "Invalid report ID" }, { status: 400 });
        }

        const report = await db.query.reports.findFirst({
            where: eq(reports.id, reportId),
            with: { patient: true, scan: true },
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
                return NextResponse.json(
                    { error: "Failed to generate PDF before release" },
                    { status: 500 }
                );
            }
            pdfUrl = `/generated-reports/report-${reportId}.pdf`;
        }

        // 5. Set releasedAt (patient can view from this point)
        const now = new Date();
        await db.update(reports).set({
            releasedAt: now,
            pdfUrl,
        }).where(eq(reports.id, reportId));

        // 6. Attempt email delivery
        let deliveryStatus: "sent" | "failed" = "failed";
        let deliveryDetail = "";

        const patientEmail = report.patient?.email;
        if (!patientEmail) {
            deliveryDetail = "Patient email not found";
        } else {
            const pdfPath = path.join(process.cwd(), "public", `generated-reports/report-${reportId}.pdf`);
            
            try {
                const pdfBuffer = await readFile(pdfPath);
                const emailHtml = buildEmailHtml(report, reportId);

                if (sendMode === "gmail") {
                    // ── Gmail send path ──
                    const { sendViaGmail } = await import("@/lib/integrations/sendViaGmail");
                    const result = await sendViaGmail({
                        doctorUserId: user.id,
                        to: patientEmail,
                        subject: `🏥 Your Medical Report #${reportId} is Ready`,
                        htmlBody: emailHtml,
                        attachment: {
                            filename: `Medical-Report-${reportId}.pdf`,
                            content: pdfBuffer,
                            mimeType: "application/pdf",
                        },
                    });
                    if (result.success) {
                        deliveryStatus = "sent";
                        deliveryDetail = `Gmail: ${result.messageId}`;
                    } else {
                        deliveryDetail = result.error || "Gmail send failed";
                    }
                } else {
                    // ── Resend send path ──
                    const { Resend } = await import("resend");
                    const resend = new Resend(process.env.RESEND_API_KEY || "re_123456789");
                    const { data, error } = await resend.emails.send({
                        from: "VaidyaVision <onboarding@resend.dev>",
                        to: patientEmail,
                        subject: `🏥 Your Medical Report #${reportId} is Ready`,
                        html: emailHtml,
                        attachments: [{
                            filename: `Medical-Report-${reportId}.pdf`,
                            content: pdfBuffer.toString("base64"),
                        }],
                    });
                    if (error) {
                        deliveryDetail = error.message;
                    } else {
                        deliveryStatus = "sent";
                        deliveryDetail = `Resend: ${data?.id}`;
                    }
                }
            } catch (emailErr) {
                deliveryDetail = String(emailErr);
            }
        }

        // 7. Update delivery status
        await db.update(reports).set({ deliveryStatus }).where(eq(reports.id, reportId));

        console.log(`[release] Report #${reportId} released. Delivery: ${deliveryStatus} (${deliveryDetail})`);

        return NextResponse.json({
            released: true,
            releasedAt: now.toISOString(),
            deliveryStatus,
            deliveryDetail,
            pdfUrl,
            sendMode,
        });
    } catch (error) {
        console.error("[/api/reports/[id]/release] Error:", error);
        return NextResponse.json(
            { error: "Release failed", detail: String(error) },
            { status: 500 }
        );
    }
}

function buildEmailHtml(report: any, reportId: number): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #065f46;">Hello ${report.patient?.name || "Patient"},</h2>
            <p>Your medical report has been reviewed and released by your doctor.</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 20px 0;">
                <p style="margin: 0; color: #064e3b; font-weight: bold;">Diagnosis</p>
                <p style="margin: 5px 0 0; font-size: 18px;">${report.diagnosis}</p>
            </div>

            <p>The full report PDF is attached to this email. You can also view it in your patient portal.</p>
            
            <a href="${appUrl}/patient/reports" 
               style="display: inline-block; background:#059669; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight: bold;">
                View in Portal
            </a>
            
            <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
                This report was generated using AI-assisted analysis and reviewed by a qualified physician.
                Confidential medical document — for authorized use only.
            </p>
        </div>
    `;
}
