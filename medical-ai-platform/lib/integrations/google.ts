/**
 * Google OAuth helpers for Gmail mailbox connection.
 * This is NOT for app login (Clerk handles that).
 * This connects a doctor's Gmail for outbound report delivery.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

const SCOPES = [
    "openid",
    "email",
    "profile",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/drive.file",
].join(" ");

function getClientId(): string {
    const id = process.env.GOOGLE_CLIENT_ID;
    if (!id) throw new Error("GOOGLE_CLIENT_ID environment variable is required");
    return id;
}

function getClientSecret(): string {
    const secret = process.env.GOOGLE_CLIENT_SECRET;
    if (!secret) throw new Error("GOOGLE_CLIENT_SECRET environment variable is required");
    return secret;
}

function getRedirectUri(): string {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${base}/api/integrations/google/callback`;
}

/**
 * Build the Google OAuth authorization URL
 */
export function buildGoogleAuthUrl(statePayload: string): string {
    const params = new URLSearchParams({
        client_id: getClientId(),
        redirect_uri: getRedirectUri(),
        response_type: "code",
        scope: SCOPES,
        access_type: "offline",
        prompt: "consent",
        state: statePayload,
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    idToken: string;
    scope: string;
}> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            code,
            client_id: getClientId(),
            client_secret: getClientSecret(),
            redirect_uri: getRedirectUri(),
            grant_type: "authorization_code",
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Token exchange failed: ${err}`);
    }

    const data = await res.json();
    return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        idToken: data.id_token,
        scope: data.scope,
    };
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
}> {
    const res = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: getClientId(),
            client_secret: getClientSecret(),
            refresh_token: refreshToken,
            grant_type: "refresh_token",
        }),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Token refresh failed: ${err}`);
    }

    const data = await res.json();
    return {
        accessToken: data.access_token,
        expiresIn: data.expires_in,
    };
}

/**
 * Get the email address from Google userinfo
 */
export async function getGoogleUserEmail(accessToken: string): Promise<string> {
    const res = await fetch(GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
        throw new Error("Failed to fetch Google user info");
    }

    const data = await res.json();
    return data.email;
}
