import crypto from "crypto";
import type { PushWebhookCommitDiff } from "@repomind/shared-types";

export class WebhookService {
  /**
   * Validates GitHub webhook signature (HMAC SHA-256) using timingSafeEqual
   * to protect against timing attacks.
   */
  verifyGitHubSignature(
    rawBody: string | Buffer,
    signatureHeader: string | undefined,
    secret: string,
  ): boolean {
    if (!signatureHeader || !secret) {
      return false;
    }

    if (!signatureHeader.startsWith("sha256=")) {
      return false;
    }

    try {
      const hmac = crypto.createHmac("sha256", secret);
      const computedHash = "sha256=" + hmac.update(rawBody).digest("hex");

      const expectedBuffer = Buffer.from(computedHash, "utf8");
      const actualBuffer = Buffer.from(signatureHeader, "utf8");

      if (expectedBuffer.length !== actualBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    } catch {
      return false;
    }
  }

  /**
   * Parses and aggregates file diffs from a GitHub push webhook payload.
   * Resolves duplicate file events across multiple commit ranges into unified added/modified/removed sets.
   */
  parsePushEvent(repoId: string, payload: any): PushWebhookCommitDiff {
    const commits = Array.isArray(payload.commits) ? payload.commits : [];
    const addedSet = new Set<string>();
    const modifiedSet = new Set<string>();
    const removedSet = new Set<string>();

    for (const c of commits) {
      // Process additions
      if (Array.isArray(c.added)) {
        for (const file of c.added) {
          addedSet.add(file);
          removedSet.delete(file);
        }
      }

      // Process modifications
      if (Array.isArray(c.modified)) {
        for (const file of c.modified) {
          // If already marked as added in this push, keep as added
          if (!addedSet.has(file)) {
            modifiedSet.add(file);
          }
          removedSet.delete(file);
        }
      }

      // Process removals
      if (Array.isArray(c.removed)) {
        for (const file of c.removed) {
          removedSet.add(file);
          addedSet.delete(file);
          modifiedSet.delete(file);
        }
      }
    }

    return {
      repositoryId: repoId,
      ref: String(payload.ref || "refs/heads/main"),
      beforeSha: String(payload.before || ""),
      afterSha: String(payload.after || payload.head_commit?.id || ""),
      added: Array.from(addedSet),
      modified: Array.from(modifiedSet),
      removed: Array.from(removedSet),
    };
  }
}

export const webhookService = new WebhookService();
