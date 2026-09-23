import type { Request, Response } from "express";
import { encryptToken, decryptToken } from "./crypto.js";
import { config } from "../config/env.js";

interface SessionPayload {
  userId: string;
  exp: number;
}

const COOKIE_NAME = "repomind_session";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Creates an encrypted, tamper-proof session token containing the user ID.
 */
export function createSessionToken(userId: string): string {
  const payload: SessionPayload = {
    userId,
    exp: Date.now() + SEVEN_DAYS_MS,
  };
  const encrypted = encryptToken(JSON.stringify(payload));
  // Pack iv, authTag, and encryptedData together
  return `${encrypted.iv}.${encrypted.authTag}.${encrypted.encryptedData}`;
}

/**
 * Verifies and decrypts an encrypted session token.
 * Returns the userId if valid and unexpired, or null otherwise.
 */
export function verifySessionToken(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }
    const [iv, authTag, encryptedData] = parts;
    if (!iv || !authTag || !encryptedData) {
      return null;
    }

    const decrypted = decryptToken({ iv, authTag, encryptedData });
    const payload = JSON.parse(decrypted) as SessionPayload;

    if (!payload.userId || typeof payload.userId !== "string") {
      return null;
    }

    if (Date.now() > payload.exp) {
      return null;
    }

    return payload.userId;
  } catch {
    return null;
  }
}

/**
 * Attaches a secure, httpOnly session cookie to the response.
 */
export function setAuthCookies(res: Response, userId: string): void {
  const token = createSessionToken(userId);
  const isProd = config.nodeEnv === "production";

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: SEVEN_DAYS_MS,
  });
}

/**
 * Clears all authentication cookies.
 */
export function clearAuthCookies(res: Response): void {
  const isProd = config.nodeEnv === "production";
  const options = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };

  res.clearCookie(COOKIE_NAME, options);
  res.clearCookie("repomind.sid", options);
}

/**
 * Resolves the authenticated user ID from:
 * 1. Express session store (req.session.userId)
 * 2. Encrypted auth cookie (req.cookies.repomind_session)
 * 3. Authorization Bearer header
 */
export function resolveUserId(req: Request): string | null {
  // 1. Check req.session.userId
  const sessionUserId = (req.session as any)?.userId;
  if (sessionUserId && typeof sessionUserId === "string") {
    return sessionUserId;
  }

  // 2. Check encrypted cookie
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken && typeof cookieToken === "string") {
    const verifiedUserId = verifySessionToken(cookieToken);
    if (verifiedUserId) {
      if (req.session) {
        (req.session as any).userId = verifiedUserId;
      }
      return verifiedUserId;
    }
  }

  // 3. Check Authorization header
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const verifiedUserId = verifySessionToken(token);
      if (verifiedUserId) {
        if (req.session) {
          (req.session as any).userId = verifiedUserId;
        }
        return verifiedUserId;
      }
    }
  }

  return null;
}
