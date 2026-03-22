
export async function POST(req: Request) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    const digits = params.get("Digits");

    let responseText = "";

    if (digits === "1") {
        responseText = "Thank you for confirming. We look forward to seeing you.";
    } else if (digits === "2") {
        responseText = "Understood. A staff member will contact you shortly to reschedule.";
    } else {
        responseText = "Invalid input. Goodbye.";
    }

    const twiml = `
    <Response>
      <Say voice="alice">${responseText}</Say>
    </Response>
  `;

    return new Response(twiml, {
        headers: {
            "Content-Type": "text/xml",
        },
    });
}
