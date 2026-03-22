import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, appointments, callOutcomes, conversations, messages, notifications, appointmentIntents } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import twilio from "twilio";

export async function POST(req: NextRequest) {
    try {
        const bodyText = await req.text();
        const params = new URLSearchParams(bodyText);
        
        // 1. Twilio Signature Validation
        const signature = req.headers.get("x-twilio-signature") || "";
        const url = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/inbound` : "";
        if (process.env.TWILIO_AUTH_TOKEN && url) {
            const paramsObj = Object.fromEntries(params.entries());
            const isValid = twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, signature, url, paramsObj);
            if (!isValid && process.env.NODE_ENV === "production") {
                console.error("[Twilio Webhook] Invalid Signature rejected.");
                return new NextResponse("Unauthorized", { status: 401 });
            }
        }
        
        const from = params.get("From");
        const body = (params.get("Body") || "").trim();
        const buttonPayload = params.get("ButtonPayload");
        
        if (!from) return new NextResponse("<Response></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
        
        const phoneNo = from.replace("whatsapp:", "").replace("+", "");
        const withPlus = `+${phoneNo}`;
        
        // 2. Identify Patient Context
        const patient = await db.query.users.findFirst({
            where: (u, { eq, or }) => or(eq(u.phone, phoneNo), eq(u.phone, withPlus))
        });
        
        if (!patient) return new NextResponse("<Response></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
        
        const actionText = (buttonPayload || body).trim().toUpperCase();

        // 3. Multi-turn Intent: Look for exact Booking Token
        if (actionText.startsWith("BOOK ")) {
            const tokenMatch = actionText.replace("BOOK ", "").trim();
            const intent = await db.query.appointmentIntents.findFirst({
                where: eq(appointmentIntents.intentToken, tokenMatch)
            });

            if (intent && intent.patientId === patient.id) {
                const now = new Date();
                
                if (intent.status !== "pending") {
                    return new NextResponse("<Response><Message><Body>This booking request is no longer active.</Body></Message></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
                }

                if (intent.expiresAt < now) {
                    await db.update(appointmentIntents).set({ status: "expired" }).where(eq(appointmentIntents.id, intent.id));
                    return new NextResponse("<Response><Message><Body>This booking token has expired.</Body></Message></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
                }

                // Found valid intent. Present Slot Offerings.
                await db.update(appointmentIntents).set({
                    status: "slot_offered"
                }).where(eq(appointmentIntents.id, intent.id));

                const twiml = `
                    <Response>
                        <Message>
                            <Body>Here are the available slots with your doctor. Reply with the letter of your choice:\n\nA: Tomorrow at 10:00 AM\nB: Tomorrow at 2:00 PM\nC: Next Monday at 9:00 AM\n\nReply with just the letter.</Body>
                        </Message>
                    </Response>
                `;
                return new NextResponse(twiml.trim(), { status: 200, headers: { "Content-Type": "text/xml" } });
            }
        }

        // 4. Multi-turn Intent: Slot Selection Resolution
        if (["A", "B", "C"].includes(actionText)) {
            // Check for an active 'slot_offered' state intent for this patient
            const pendingIntent = await db.query.appointmentIntents.findFirst({
                where: (i, { eq, and }) => and(eq(i.patientId, patient.id), eq(i.status, "slot_offered")),
                orderBy: [desc(appointmentIntents.createdAt)]
            });

            if (pendingIntent) {
                const now = new Date();
                if (pendingIntent.expiresAt < now) {
                    await db.update(appointmentIntents).set({ status: "expired" }).where(eq(appointmentIntents.id, pendingIntent.id));
                    return new NextResponse("<Response><Message><Body>This booking request has expired.</Body></Message></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
                }

                let slotDate = new Date();
                if (actionText === "A") { slotDate.setDate(slotDate.getDate() + 1); slotDate.setHours(10, 0, 0, 0); }
                if (actionText === "B") { slotDate.setDate(slotDate.getDate() + 1); slotDate.setHours(14, 0, 0, 0); }
                if (actionText === "C") { slotDate.setDate(slotDate.getDate() + 3); slotDate.setHours(9, 0, 0, 0); }

                // Doctor Availability Collisions Check
                const collision = await db.query.appointments.findFirst({
                    where: (a, { eq, and }) => and(
                        eq(a.doctorId, pendingIntent.doctorId),
                        eq(a.scheduledAt, slotDate)
                    )
                });

                if (collision) {
                    return new NextResponse("<Response><Message><Body>That slot was just taken! Please text BOOK [token] again to view updated slots.</Body></Message></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
                }

                // Provision real native Appointment block
                const [newAppt] = await db.insert(appointments).values({
                    patientId: patient.id,
                    doctorId: pendingIntent.doctorId,
                    scheduledAt: slotDate,
                    type: "follow_up",
                    notes: "Booked via WhatsApp Automated Scheduler",
                    status: "confirmed",
                    source: "whatsapp",
                    sourceRef: pendingIntent.intentToken
                }).returning({ id: appointments.id });

                // Lock the appointment slot intent
                await db.update(appointmentIntents).set({
                    status: "booked",
                    selectedSlot: slotDate,
                    bookedAppointmentId: newAppt.id
                }).where(eq(appointmentIntents.id, pendingIntent.id));
                
                // Construct Notification
                await db.insert(notifications).values({
                    userId: pendingIntent.doctorId,
                    type: "appointment_scheduled",
                    message: `Patient ${patient.name} booked a follow-up via WhatsApp for ${slotDate.toLocaleString()}.`,
                    link: `/doctor/appointments`,
                });
                
                await db.insert(callOutcomes).values({
                    patientId: patient.id,
                    doctorId: pendingIntent.doctorId,
                    reportId: pendingIntent.reportId,
                    responded: true,
                    responseCode: "booked_slot_" + actionText,
                    lastContactAt: new Date()
                });

                const twiml = `
                    <Response>
                        <Message>
                            <Body>✅ Appointment Confirmed! You are booked for ${slotDate.toLocaleString(undefined, {weekday: 'short', hour: '2-digit', minute:'2-digit'})}. Please confirm details in your Portal dashboard.</Body>
                        </Message>
                    </Response>
                `;
                return new NextResponse(twiml.trim(), { status: 200, headers: { "Content-Type": "text/xml" } });
            }
        }

        // 5. Default Chat Fallback Logging
        const existingConv = await db.query.conversations.findFirst({
            where: eq(conversations.patientId, patient.id),
            orderBy: [desc(conversations.lastMessageAt)]
        });

        if (existingConv) {
            await db.insert(messages).values({
                conversationId: existingConv.id,
                senderId: patient.id,
                content: body,
                type: "text",
                createdAt: new Date(),
            });
            await db.update(conversations).set({ lastMessageAt: new Date() }).where(eq(conversations.id, existingConv.id));
        }

        return new NextResponse("<Response></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });

    } catch (error) {
        console.error("[Twilio Inbound Webhook] Secure Endpoint Error:", error);
        return new NextResponse("<Response></Response>", { status: 500, headers: { "Content-Type": "text/xml" } });
    }
}
