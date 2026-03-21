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

        // 5.5 Optional: Upload to Google Drive
        let driveUrl = "";
        try {
            const { readFile } = await import("fs/promises");
            const path = await import("path");
            const pdfPath = path.join(process.cwd(), "public", `generated-reports/report-${reportId}.pdf`);
            const pdfBuffer = await readFile(pdfPath);

            const { uploadToGoogleDrive } = await import("@/lib/integrations/googleDrive");
            const driveRes = await uploadToGoogleDrive(
                user.id,
                `VaidyaVision-Report-${reportId}.pdf`,
                pdfBuffer,
                "application/pdf"
            );
            if (driveRes.success && driveRes.webViewLink) {
                driveUrl = driveRes.webViewLink;
                console.log(`[Google Drive] Uploaded report ${reportId}: ${driveUrl}`);
            } else {
                console.error("[Google Drive] Upload failed:", driveRes.error);
            }
        } catch (err) {
            console.error("[Google Drive] Execution Error:", err);
        }

        // 6. Build payload for n8n
        const appDomain = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        // Convert local PDF path to absolute URL
        const absolutePdfUrl = pdfUrl.startsWith("http") ? pdfUrl : `${appDomain}${pdfUrl}`;
        const localReportUrl = `${appDomain}/patient/reports/${reportId}`;

        const payload = {
            reportId: report.id,
            scanId: report.scanId,
            patientName: report.patient?.name || "Patient",
            patientPhone: report.patient?.phone || "",
            patientEmail: report.patient?.email || "",
            doctorName: report.doctor?.name || "Doctor",
            doctorEmail: report.doctor?.email || "",
            hospitalName: report.hospitalTemplate?.name || "Hospital",
            diagnosis: report.diagnosis || "No diagnosis provided",
            findings: report.findings || "No findings recorded",
            recommendations: report.recommendations || "No recommendations",
            severity: report.severity || "medium",
            symptoms: report.scan?.symptoms || "",
            reportText: [
                report.diagnosis ? `Diagnosis: ${report.diagnosis}` : "",
                report.findings ? `Findings: ${report.findings}` : "",
                report.recommendations ? `Recommendations: ${report.recommendations}` : ""
            ].filter(Boolean).join("\n\n") || "No report text available.",
            // Swap out the local URLs for the Google Drive link if upload succeeded
            reportUrl: driveUrl || localReportUrl,
            pdfUrl: driveUrl || absolutePdfUrl,
            releasedAt: report.releasedAt?.toISOString() || now.toISOString(),
            nextAppointmentAt: null,
        };

        // 7. Send to n8n webhook
        const webhookUrl = process.env.N8N_REPORT_READY_WEBHOOK_URL;
        const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

        let deliveryStatus: "sent" | "failed" = "failed";
        let deliveryDetail = "";

        if (!webhookUrl) {
            deliveryDetail = "n8n Webhook URL not configured";
        } else {
            try {
                const headers: Record<string, string> = {
                    "Content-Type": "application/json",
                };
                if (webhookSecret) {
                    headers["x-api-key"] = webhookSecret;
                }

                const n8nRes = await fetch(webhookUrl, {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload),
                });

                if (n8nRes.ok) {
                    deliveryStatus = "sent";
                    deliveryDetail = "Dispatched via n8n";
                } else {
                    const errText = await n8nRes.text();
                    deliveryDetail = `n8n Error: ${n8nRes.status} ${errText}`;
                }
            } catch (err) {
                deliveryDetail = `n8n Request Failed: ${String(err)}`;
            }
        }

        // 8. Update delivery status in DB
        await db.update(reports).set({ deliveryStatus }).where(eq(reports.id, reportId));

        return NextResponse.json({
            notified: true,
            deliveryStatus,
            deliveryDetail,
            pdfUrl,
            releasedAt: report.releasedAt || now,
        });

    } catch (error) {
        console.error("[/api/reports/[id]/notify] Error:", error);
        return NextResponse.json({ error: "Notification failed", detail: String(error) }, { status: 500 });
    }
}
