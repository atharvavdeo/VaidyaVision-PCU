import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
    const envKey = process.env.ENCRYPTION_KEY;
    if (!envKey || envKey.length < 16) {
        throw new Error(
            "ENCRYPTION_KEY environment variable is required and must be at least 16 characters. " +
            "Generate with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
        );
    }
    return scryptSync(envKey, "vaidyavision-salt", KEY_LENGTH);
}

/**
 * Encrypt a plaintext string. Returns a base64 string containing iv:authTag:ciphertext
 */
export function encrypt(plaintext: string): string {
    const key = getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    // Pack as iv:authTag:ciphertext (all hex)
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a string produced by encrypt()
 */
export function decrypt(packed: string): string {
    const key = getKey();
    const parts = packed.split(":");
    if (parts.length !== 3) {
        throw new Error("Invalid encrypted data format");
    }

    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}
