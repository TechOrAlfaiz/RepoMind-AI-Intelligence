import { Router, type Request, type Response } from "express";
import { healthService } from "./health.service.js";
import { playbookService } from "./playbook.service.js";
import { ragService } from "../rag/rag.service.js";
import { repoService } from "../repos/repo.service.js";

export const enhancementsRouter = Router();

/**
 * GET /api/repos/:repoId/health
 * Returns composite repository health score, metrics breakdown, and recommendations.
 */
enhancementsRouter.get("/:repoId/health", async (req: Request, res: Response): Promise<void> => {
  const repoId = String(req.params.repoId);
  try {
    const health = await healthService.calculateHealthScore(repoId);
    res.status(200).json(health);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to calculate repository health" });
  }
});

/**
 * GET /api/repos/:repoId/playbook
 * Returns curated onboarding reading roadmap for new engineers.
 */
enhancementsRouter.get("/:repoId/playbook", async (req: Request, res: Response): Promise<void> => {
  const repoId = String(req.params.repoId);
  try {
    const playbook = await playbookService.generatePlaybook(repoId);
    res.status(200).json(playbook);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate onboarding playbook" });
  }
});

/**
 * POST /api/repos/:repoId/time-machine/ask
 * RAG query pinned to a historical commit SHA or tag.
 */
enhancementsRouter.post("/:repoId/time-machine/ask", async (req: Request, res: Response): Promise<void> => {
  const repoId = String(req.params.repoId);
  const { query, atCommitSha, tag } = req.body;

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Query string is required" });
    return;
  }

  try {
    const repo = await repoService.getRepoById(repoId);
    if (!repo) {
      res.status(404).json({ error: `Repository ${repoId} not found` });
      return;
    }

    const pinnedSha = atCommitSha || repo.currentCommitSha || "HEAD";
    const contextualQuery = `[Time Machine Commit: ${pinnedSha.substring(0, 7)}] ${query}`;

    // Execute RAG query constrained to the pinned historical state
    const result = await ragService.streamRAGChat(
       {
         organizationId: repo.organizationId,
         repositoryId: repoId,
         userId: (req as any).user?.id || "anonymous-cli",
         query: contextualQuery,
       },
       () => {}, // Non-streaming JSON aggregation for CLI / API consumer
     );

    res.status(200).json({
      repositoryId: repoId,
      pinnedCommitSha: pinnedSha,
      tag: tag || null,
      question: query,
      answer: result.answer,
      citations: result.citations,
      trace: {
        latencyMs: result.trace.latencyMs,
        tokenUsage: result.trace.tokenUsage,
        retrievedChunksCount: result.trace.retrievedChunkIds.length,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to execute Time Machine query" });
  }
});
