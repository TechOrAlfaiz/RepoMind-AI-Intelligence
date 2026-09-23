import crypto from "node:crypto";
import { config } from "../config/env.js";
import type { EncryptedToken } from "@repomind/shared-types";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96 bits for GCM

/**
 * Derives a consistent 32-byte key Buffer from the configured secret.
 */
function getKeyBuffer(): Buffer {
  const secret = config.tokenEncryptionKey;
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  // Fallback: SHA-256 hash of whatever string was provided to always get exactly 32 bytes
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string (such as a GitHub access token) using AES-256-GCM.
 */
export function encryptToken(plaintext: string): EncryptedToken {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getKeyBuffer();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypts an EncryptedToken payload back to plaintext. Throws if data has been tampered with.
 */
export function decryptToken(payload: EncryptedToken): string {
  const key = getKeyBuffer();
  const iv = Buffer.from(payload.iv, "hex");
  const authTag = Buffer.from(payload.authTag, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(payload.encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
