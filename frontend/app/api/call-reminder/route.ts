
import { NextResponse } from "next/server";
import twilio from "twilio";

// Initialize Twilio client
// Ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE are in .env
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

export async function POST(req: Request) {
    try {
        if (!client) {
            console.warn("Twilio credentials missing");
            return NextResponse.json({ error: "Twilio not configured" }, { status: 500 });
        }

        const { patientPhone, patientName, appointmentTime } = await req.json();

        // In production, validate phone number format
        if (!patientPhone) {
            return NextResponse.json({ error: "Phone number required" }, { status: 400 });
        }

        // Construct the TwiML URL (must be public)
        // For local dev, you'd need ngrok. We'll use the deployed URL or a placeholder if local.
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const twimlUrl = `${baseUrl}/api/twiml-reminder?name=${encodeURIComponent(patientName || "Patient")}&time=${encodeURIComponent(appointmentTime || "upcoming")}`;

        if (!fromPhone) {
            return NextResponse.json({
                called: false,
                error: "No Twilio phone number configured. Purchase a number at twilio.com/console/phone-numbers and set TWILIO_PHONE_NUMBER in .env.local"
            }, { status: 400 });
        }

        const call = await client.calls.create({
            to: patientPhone,
            from: fromPhone,
            url: twimlUrl,
        });

        return NextResponse.json({ called: true, sid: call.sid });

    } catch (error: any) {
        console.error("[/api/call-reminder] Error:", error);
        const msg = error?.message || error?.toString() || "Internal Server Error";
        return NextResponse.json({ called: false, error: msg }, { status: 500 });
    }
}
