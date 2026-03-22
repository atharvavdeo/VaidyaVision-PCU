import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { reportDeliveries } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Twilio delivers status callbacks as application/x-www-form-urlencoded
export async function POST(req: NextRequest) {
    try {
        const textData = await req.text();
        const searchParams = new URLSearchParams(textData);
        
        const messageSid = searchParams.get("MessageSid");
        const rawStatus = searchParams.get("MessageStatus")?.toLowerCase(); // e.g. "delivered", "read", "failed"
        const errorCode = searchParams.get("ErrorCode");
        const errorMessage = searchParams.get("ErrorMessage");

        if (!messageSid || !rawStatus) {
            return NextResponse.json({ error: "Missing required Twilio parameters" }, { status: 400 });
        }

        // Map Twilio status to our DB status
        let mappedStatus: "queued" | "processing" | "sent" | "delivered" | "read" | "failed" | "undelivered" = "processing";
        const validStatuses = ["queued", "processing", "sent", "delivered", "read", "failed", "undelivered"];
        
        if (validStatuses.includes(rawStatus)) {
            mappedStatus = rawStatus as any;
        } else if (rawStatus === "undelivered") {
            mappedStatus = "undelivered";
        }

        const updates: any = {
            status: mappedStatus,
            updatedAt: new Date()
        };

        if (mappedStatus === "delivered") updates.deliveredAt = new Date();
        if (mappedStatus === "read") updates.readAt = new Date();
        if (errorCode) {
            updates.lastError = `[${errorCode}] ${errorMessage || "Unknown error"}`;
            // If Twilio says failed, ensure we mark it
            if (rawStatus === "failed" || rawStatus === "undelivered") {
                updates.errorMessage = updates.lastError;
            }
        }

        await db.update(reportDeliveries)
            .set(updates)
            .where(eq(reportDeliveries.providerMessageSid, messageSid));

        // Return empty TwiML response as best practice for Twilio
        return new NextResponse("<Response></Response>", {
            status: 200,
            headers: { "Content-Type": "text/xml" }
        });

    } catch (error) {
        console.error("[Twilio Status Webhook] Error:", error);
        return new NextResponse("<Response></Response>", {
            status: 500,
            headers: { "Content-Type": "text/xml" }
        });
    }
}
