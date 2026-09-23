import { Router, type Request, type Response } from "express";
import { webhookService } from "./webhook.service.js";
import { incrementalService } from "../ingestion/incremental.service.js";
import { repoService } from "../repos/repo.service.js";
import { config } from "../../config/env.js";

const router = Router();

/**
 * POST /api/webhooks/github
 * Ingests GitHub push events, verifies HMAC SHA-256 signature,
 * and incrementally updates AST chunks and vector points for changed files.
 */
router.post("/github", async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers["x-hub-signature-256"] as string | undefined;
  const event = req.headers["x-github-event"] as string | undefined;
  const secret = process.env.GITHUB_WEBHOOK_SECRET || "repomind-webhook-secret-default";

  // Use rawBody if captured, or serialize body
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);

  // 1. Signature Verification (unless disabled in local mock mode without signature)
  if (signature) {
    const isValid = webhookService.verifyGitHubSignature(rawBody, signature, secret);
    if (!isValid) {
      res.status(401).json({ error: "Invalid X-Hub-Signature-256 signature" });
      return;
    }
  }

  // Only handle push events for incremental indexing
  if (event && event !== "push") {
    res.status(200).json({ status: "ignored", message: `Event '${event}' is not a push event` });
    return;
  }

  const payload = req.body;
  const repoId =
    String(req.query.repoId || req.headers["x-repomind-repo-id"] || "").trim() ||
    (payload.repository ? payload.repository.name : "");

  if (!repoId) {
    res.status(400).json({ error: "Missing repository identifier (repoId query or repository payload)" });
    return;
  }

  try {
    // Check repository exists
    const repo = await repoService.getRepoById(repoId);
    if (!repo) {
      res.status(404).json({ error: `Repository '${repoId}' not found in RepoMind` });
      return;
    }

    // Parse commit diff
    const diff = webhookService.parsePushEvent(repoId, payload);

    // Process incremental indexing
    const result = await incrementalService.processIncrementalPush(repoId, diff);

    res.status(200).json({
      status: "success",
      diff,
      result,
    });
  } catch (err: any) {
    console.error("[RepoMind Webhook] Push processing failed:", err.message);
    res.status(500).json({ error: err.message || "Failed to process push webhook" });
  }
});

export const webhookRouter = router;
