
export async function POST(req: Request) {
    // Parse query params for dynamic content in the call
    const url = new URL(req.url);
    const name = url.searchParams.get("name") || "there";
    const time = url.searchParams.get("time") || "scheduled time";

    const twiml = `
    <Response>
      <Say voice="alice">
        Hello ${name}! This is VaidyaVision calling to remind you about your appointment 
        scheduled for ${time}. Please confirm your attendance by pressing 1.
      </Say>
      <Gather numDigits="1" action="/api/twiml-confirm">
        <Say>Press 1 to confirm, or 2 to request a reschedule.</Say>
      </Gather>
      <Say>We didn't receive any input. Goodbye!</Say>
    </Response>
  `;

    return new Response(twiml, {
        headers: {
            "Content-Type": "text/xml",
        },
    });
}
