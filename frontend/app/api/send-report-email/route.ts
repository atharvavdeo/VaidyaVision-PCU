
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { scans, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const resend = new Resend(process.env.RESEND_API_KEY || "re_123456789");

export async function POST(req: Request) {
  try {
    const { scanId } = await req.json();

    if (!scanId) {
      return NextResponse.json({ error: "Scan ID required" }, { status: 400 });
    }

    const scan = await db.query.scans.findFirst({
      where: eq(scans.id, scanId),
      with: {
        patient: true
      }
    });

    if (!scan || !scan.patient) {
      return NextResponse.json({ error: "Scan or patient not found" }, { status: 404 });
    }

    // In a real app, use a proper email template
    const { data, error } = await resend.emails.send({
      from: "VaidyaVision <onboarding@resend.dev>",
      to: "atharva.deo03@svkmmumbai.onmicrosoft.com",
      subject: "🏥 Your Medical Report is Ready",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #065f46;">Hello ${scan.patient.name},</h2>
          <p>Your scan (ID: #${scan.id}) has been reviewed by our medical team.</p>
          
          <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 20px 0;">
            <p style="margin: 0; color: #064e3b; font-weight: bold;">AI Diagnosis</p>
            <p style="margin: 5px 0 0; font-size: 18px;">${scan.aiDiagnosis || "Pending Analysis"}</p>
          </div>

          <p>You can view the full detailed report by logging into your dashboard.</p>
          
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/patient/scans" 
             style="display: inline-block; background:#059669; color:white; padding:12px 24px; text-decoration:none; border-radius:6px; font-weight: bold;">
            Login to Portal
          </a>
          
          <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
            This is an automated message from VaidyaVision AI Medical Platform.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sent: true, id: data?.id });

  } catch (error) {
    console.error("[/api/send-report-email] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
