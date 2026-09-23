import { Router, type Request, type Response } from "express";
import { issueService } from "../issues/issue.service.js";
import { prAnalyzerService } from "../prs/pr-analyzer.service.js";
import { architectureGraphService } from "../architecture/graph.service.js";
import { repoService } from "../repos/repo.service.js";

const router = Router();

/**
 * POST /api/repos/:id/issues/ingest
 * Ingests an array of GitHub issues for the specified repository.
 */
router.post("/:id/issues/ingest", async (req: Request, res: Response): Promise<void> => {
  const repoId = String(req.params.id);
  const { issues } = req.body;

  if (!Array.isArray(issues)) {
    res.status(400).json({ error: "Invalid payload: 'issues' must be an array" });
    return;
  }

  try {
    const saved = await issueService.ingestIssues(repoId, issues);
    res.status(200).json({
      status: "success",
      count: saved.length,
      issues: saved,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to ingest issues" });
  }
});

/**
 * GET /api/repos/:id/issues
 * Lists issues with optional state and label filters.
 */
router.get("/:id/issues", async (req: Request, res: Response): Promise<void> => {
  const repoId = String(req.params.id);
  const state = req.query.state as "open" | "closed" | undefined;
  const label = req.query.label as string | undefined;

  try {
    const issues = await issueService.getIssues(repoId, { state, label });
    res.status(200).json({ status: "success", count: issues.length, issues });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch issues" });
  }
});

/**
 * POST /api/repos/:id/investigate-bug
 * Runs the Bug Investigator correlating a bug query against code chunks and similar issues.
 */
router.post("/:id/investigate-bug", async (req: Request, res: Response): Promise<void> => {
  const repoId = String(req.params.id);
  const { query } = req.body;

  if (!query || typeof query !== "string") {
    res.status(400).json({ error: "Missing required string field 'query'" });
    return;
  }

  try {
    const result = await issueService.investigateBug(repoId, query.trim());
    res.status(200).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Bug investigation failed" });
  }
});

/**
 * POST /api/repos/:id/analyze-pr
 * Evaluates a PR diff, computing risk level, affected symbols, review checklist, and suggested tests.
 * STRICT INVARIANT: Advisory guidance only; never auto-approves or auto-merges.
 */
router.post("/:id/analyze-pr", async (req: Request, res: Response): Promise<void> => {
  const repoId = String(req.params.id);
  const { prNumber, title, author, changedFiles, diffDescription } = req.body;

  if (!changedFiles || !Array.isArray(changedFiles)) {
    res.status(400).json({ error: "Missing required array field 'changedFiles'" });
    return;
  }

  try {
    const analysis = await prAnalyzerService.analyzePullRequest({
      repositoryId: repoId,
      prNumber: Number(prNumber) || 1,
      title: title || "Untitled Pull Request",
      author: author || "contributor",
      changedFiles,
      diffDescription,
    });
    res.status(200).json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "PR analysis failed" });
  }
});

/**
 * GET /api/repos/:id/architecture-graph
 * Computes deterministic static architecture dependency graph and Mermaid syntax.
 */
router.get("/:id/architecture-graph", async (req: Request, res: Response): Promise<void> => {
  const repoId = String(req.params.id);

  try {
    const graph = await architectureGraphService.buildArchitectureGraph(repoId);
    res.status(200).json(graph);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate architecture graph" });
  }
});

export const intelligenceRouter = router;
