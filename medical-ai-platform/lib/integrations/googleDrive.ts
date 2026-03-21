import { db } from "@/lib/db";
import { emailConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/security/encrypt";
import { refreshAccessToken } from "@/lib/integrations/google";

interface DriveUploadResult {
    success: boolean;
    webViewLink?: string;
    error?: string;
}

/**
 * Uploads a file to Google Drive and makes it viewable by anyone with the link.
 */
export async function uploadToGoogleDrive(
    doctorUserId: number,
    filename: string,
    buffer: Buffer,
    mimeType: string
): Promise<DriveUploadResult> {
    // 1. Get OAuth token
    const connection = await db.query.emailConnections.findFirst({
        where: and(
            eq(emailConnections.userId, doctorUserId),
            eq(emailConnections.provider, "gmail"),
            eq(emailConnections.status, "active"),
        ),
    });

    if (!connection) {
        return { success: false, error: "No active Google connection found" };
    }

    let accessToken: string;
    let refreshToken: string;
    try {
        accessToken = decrypt(connection.accessTokenEncrypted);
        refreshToken = decrypt(connection.refreshTokenEncrypted);
    } catch {
        return { success: false, error: "Failed to decrypt tokens" };
    }

    // 2. Refresh token if needed
    if (connection.expiresAt && connection.expiresAt < new Date()) {
        try {
            const refreshed = await refreshAccessToken(refreshToken);
            accessToken = refreshed.accessToken;

            await db.update(emailConnections).set({
                accessTokenEncrypted: encrypt(accessToken),
                expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
                updatedAt: new Date(),
            }).where(eq(emailConnections.id, connection.id));
        } catch {
            await db.update(emailConnections).set({
                status: "expired",
                updatedAt: new Date(),
            }).where(eq(emailConnections.id, connection.id));
            return { success: false, error: "Token expired. Please reconnect Google account." };
        }
    }

    // 3. Upload file via Multipart Upload
    const boundary = `boundary_${Date.now()}`;
    const metadata = {
        name: filename,
        mimeType,
    };

    const requestBody = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
        Buffer.from(JSON.stringify(metadata)),
        Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
        buffer,
        Buffer.from(`\r\n--${boundary}--`),
    ]);

    try {
        const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": `multipart/related; boundary=${boundary}`,
            },
            body: requestBody,
        });

        if (!uploadRes.ok) {
            const errBody = await uploadRes.text();
            throw new Error(`Drive upload failed: ${uploadRes.status} ${errBody}`);
        }

        const fileData = await uploadRes.json();
        const fileId = fileData.id;

        // 4. Set permission to "anyone with link can view"
        const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: "anyone",
                role: "reader",
            }),
        });

        if (!permRes.ok) {
            console.error("Failed to set file permissions", await permRes.text());
        }

        // 5. Fetch the file to get the webViewLink
        const getRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=webViewLink`, {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        const getResData = await getRes.json();
        return {
            success: true,
            webViewLink: getResData.webViewLink,
        };

    } catch (err) {
        console.error("[uploadToGoogleDrive] Error:", err);
        return { success: false, error: String(err) };
    }
}
