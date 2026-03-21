import { db } from "@/lib/db";
import { emailConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/security/encrypt";
import { refreshAccessToken } from "@/lib/integrations/google";

interface GmailSendOptions {
    doctorUserId: number;
    to: string;
    subject: string;
    htmlBody: string;
    attachment?: {
        filename: string;
        content: Buffer;
        mimeType: string;
    };
}

interface GmailSendResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

/**
 * Send an email via the doctor's connected Gmail account.
 * Handles token refresh automatically.
 */
export async function sendViaGmail(options: GmailSendOptions): Promise<GmailSendResult> {
    const { doctorUserId, to, subject, htmlBody, attachment } = options;

    // 1. Load connection
    const connection = await db.query.emailConnections.findFirst({
        where: and(
            eq(emailConnections.userId, doctorUserId),
            eq(emailConnections.provider, "gmail"),
            eq(emailConnections.status, "active"),
        ),
    });

    if (!connection) {
        return { success: false, error: "No active Gmail connection found" };
    }

    // 2. Decrypt tokens
    let accessToken: string;
    let refreshToken: string;
    try {
        accessToken = decrypt(connection.accessTokenEncrypted);
        refreshToken = decrypt(connection.refreshTokenEncrypted);
    } catch (err) {
        return { success: false, error: "Failed to decrypt tokens" };
    }

    // 3. Refresh if expired
    if (connection.expiresAt && connection.expiresAt < new Date()) {
        try {
            const refreshed = await refreshAccessToken(refreshToken);
            accessToken = refreshed.accessToken;

            // Update stored token
            await db.update(emailConnections).set({
                accessTokenEncrypted: encrypt(accessToken),
                expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
                updatedAt: new Date(),
            }).where(eq(emailConnections.id, connection.id));
        } catch (err) {
            // Mark connection as expired
            await db.update(emailConnections).set({
                status: "expired",
                updatedAt: new Date(),
            }).where(eq(emailConnections.id, connection.id));
            return { success: false, error: "Gmail token refresh failed. Please reconnect." };
        }
    }

    // 4. Build MIME message
    const boundary = `boundary_${Date.now()}`;
    let mimeMessage: string;

    if (attachment) {
        const attachmentBase64 = attachment.content.toString("base64");
        mimeMessage = [
            `From: ${connection.providerEmail}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            ``,
            `--${boundary}`,
            `Content-Type: text/html; charset="UTF-8"`,
            ``,
            htmlBody,
            ``,
            `--${boundary}`,
            `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
            `Content-Disposition: attachment; filename="${attachment.filename}"`,
            `Content-Transfer-Encoding: base64`,
            ``,
            attachmentBase64,
            ``,
            `--${boundary}--`,
        ].join("\r\n");
    } else {
        mimeMessage = [
            `From: ${connection.providerEmail}`,
            `To: ${to}`,
            `Subject: ${subject}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset="UTF-8"`,
            ``,
            htmlBody,
        ].join("\r\n");
    }

    // 5. Send via Gmail API
    const raw = Buffer.from(mimeMessage).toString("base64url");

    try {
        const res = await fetch("https://www.googleapis.com/gmail/v1/users/me/messages/send", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ raw }),
        });

        if (!res.ok) {
            const err = await res.text();
            console.error("[sendViaGmail] Gmail API error:", err);

            // If 401, mark as expired
            if (res.status === 401) {
                await db.update(emailConnections).set({
                    status: "expired",
                    updatedAt: new Date(),
                }).where(eq(emailConnections.id, connection.id));
            }

            return { success: false, error: `Gmail API error: ${res.status}` };
        }

        const data = await res.json();
        return { success: true, messageId: data.id };
    } catch (err) {
        return { success: false, error: `Gmail send failed: ${String(err)}` };
    }
}
