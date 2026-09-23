import type { Request, Response } from "express";
import mongoose from "mongoose";
import { repoService } from "./repo.service.js";
import { orgService } from "../orgs/org.service.js";
import { addIngestionJob } from "../ingestion/ingestion.queue.js";
import { getRepoFiles, getFileByPath } from "../ingestion/ingestion.worker.js";
import { chunkService } from "../chunking/chunk.service.js";
import { retrievalService } from "../retrieval/retrieval.service.js";
import { evaluatorService } from "../retrieval/evaluator.service.js";
import { auditService } from "../audit/audit.service.js";
import type { ConnectRepoDTO } from "@repomind/shared-types";

export class RepoController {
  /**
   * GET /api/repos/github
   * Lists GitHub repositories available to the authenticated user.
   */
  async listGitHubRepos(req: Request, res: Response): Promise<void> {
    try {
      const repos = await repoService.listUserGitHubRepos(req.user!.id);
      res.status(200).json({ repositories: repos });
    } catch (err: any) {
      console.error("[RepoMind Repo] List GitHub repos error:", err.message);
      res.status(500).json({ error: err.message || "Failed to fetch GitHub repositories" });
    }
  }

  /**
   * POST /api/repos/connect
   * Connects a repository to the target organization and dispatches background ingestion.
   */
  async connectRepo(req: Request, res: Response): Promise<void> {
    const orgId = String(req.body.organizationId || req.headers["x-organization-id"]);
    const { githubRepoId, name, fullName, defaultBranch, branch, isPrivate } = req.body as ConnectRepoDTO;

    if (!githubRepoId || !name || !fullName) {
      res.status(400).json({ error: "githubRepoId, name, and fullName are required" });
      return;
    }

    try {
      const repo = await repoService.connectRepo(orgId, {
        organizationId: orgId,
        githubRepoId,
        name,
        fullName,
        defaultBranch: defaultBranch || "main",
        branch,
        isPrivate: !!isPrivate,
      });

      // Non-negotiable: Background ingestion job enqueued, HTTP response returns immediately
      addIngestionJob(repo.id, req.user!.id).catch((err) => {
        console.error(`[RepoMind Repo] Failed to enqueue background ingestion for ${repo.id}:`, err);
      });

      res.status(201).json({ repository: repo });
    } catch (err: any) {
      console.error("[RepoMind Repo] Connect repo error:", err.message);
      const isConflict = err.message.includes("already connected");
      res.status(isConflict ? 409 : 500).json({ error: err.message || "Failed to connect repository" });
    }
  }

  /**
   * GET /api/repos?organizationId=...
   * Lists all connected repositories for an organization.
   */
  async listOrgRepos(req: Request, res: Response): Promise<void> {
    const rawOrgId = req.query.organizationId || req.headers["x-organization-id"];

    try {
      if (rawOrgId && mongoose.isValidObjectId(String(rawOrgId))) {
        const repos = await repoService.listOrgRepos(String(rawOrgId));
        res.status(200).json({ repositories: repos });
        return;
      }

      // If orgId is not explicitly specified or invalid, query across the user's accessible organizations
      const userOrgs = await orgService.getUserOrganizations(req.user!.id);
      if (!userOrgs || userOrgs.length === 0) {
        res.status(200).json({ repositories: [] });
        return;
      }

      const allRepos = [];
      for (const org of userOrgs) {
        const repos = await repoService.listOrgRepos(org.id);
        allRepos.push(...repos);
      }
      res.status(200).json({ repositories: allRepos });
    } catch (err: any) {
      console.error("[RepoMind Repo] List org repos error:", err);
      res.status(500).json({ error: "Failed to list organization repositories" });
    }
  }

  /**
   * GET /api/repos/:repoId
   * Retrieves single repository details.
   */
  async getRepo(req: Request, res: Response): Promise<void> {
    const repoId = String(req.params.repoId);

    try {
      const repo = await repoService.getRepoById(repoId);
      res.status(200).json({ repository: repo });
    } catch (err: any) {
      res.status(404).json({ error: "Repository not found" });
    }
  }

  /**
   * GET /api/repos/:repoId/files
   * Returns all indexed files for the repository.
   */
  async getRepoFiles(req: Request, res: Response): Promise<void> {
    const repoId = String(req.params.repoId);

    try {
      const files = await getRepoFiles(repoId);
      res.status(200).json({ files });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch repository files" });
    }
  }

  /**
   * GET /api/repos/:repoId/chunks
   * Returns all extracted AST chunks for the repository.
   */
  async getRepoChunks(req: Request, res: Response): Promise<void> {
    const repoId = String(req.params.repoId);

    try {
      const chunks = await chunkService.getRepoChunks(repoId);
      res.status(200).json({ chunks });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch repository chunks" });
    }
  }

  /**
   * POST /api/repos/:repoId/index
   * Triggers manual re-index of the repository via background queue.
   */
  async triggerReindex(req: Request, res: Response): Promise<void> {
    const repoId = String(req.params.repoId);

    try {
      const updated = await repoService.triggerReindex(repoId);

      // Record audit log for sensitive re-index trigger
      await auditService.log({
        actorId: req.user?.id || "anonymous",
        actorEmail: req.user?.email || undefined,
        organizationId: req.organization?.id,
        repositoryId: repoId,
        action: "repo:reindex",
        resource: `repository:${repoId}`,
        status: "success",
        correlationId: req.correlationId,
      });

      // Enqueue background ingestion
      addIngestionJob(repoId, req.user!.id).catch((err) => {
        console.error(`[RepoMind Repo] Failed to enqueue background reindex for ${repoId}:`, err);
      });

      res.status(200).json({
        message: "Re-indexing job queued successfully",
        repository: updated,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to trigger re-index" });
    }
  }

  /**
   * DELETE /api/repos/:repoId
   * Cascading deletion of repository, files, chunks, and vector embeddings.
   */
  async deleteRepo(req: Request, res: Response): Promise<void> {
    const repoId = String(req.params.repoId);

    try {
      await repoService.deleteRepo(repoId);

      // Record audit log for sensitive repository deletion
      await auditService.log({
        actorId: req.user?.id || "anonymous",
        actorEmail: req.user?.email || undefined,
        organizationId: req.organization?.id,
        repositoryId: repoId,
        action: "repo:delete",
        resource: `repository:${repoId}`,
        status: "success",
        correlationId: req.correlationId,
      });

      res.status(200).json({
        message: "Repository and all associated data deleted successfully",
        repoId,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to delete repository" });
    }
  }

  /**
   * POST /api/repos/:repoId/retrieve
   * Performs vector similarity retrieval strictly scoped to the repository.
   */
  async retrieveChunks(req: Request, res: Response): Promise<void> {
    const repoId = String(req.params.repoId);
    const { query, limit, scoreThreshold } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      res.status(400).json({ error: "Missing or empty query parameter" });
      return;
    }

    try {
      const response = await retrievalService.retrieveChunks({
        repositoryId: repoId,
        query: query.trim(),
        limit: limit ? Number(limit) : 8,
        scoreThreshold: scoreThreshold !== undefined ? Number(scoreThreshold) : 0.1,
      });

      res.status(200).json(response);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Vector retrieval failed" });
    }
  }

  /**
   * GET /api/repos/:repoId/file-content?path=...
   * Returns full file content and commit SHA for Monaco Code Viewer.
   */
  async getFileContent(req: Request, res: Response): Promise<void> {
    const repoId = String(req.params.repoId);
    const filePath = String(req.query.path || "").trim();

    if (!filePath) {
      res.status(400).json({ error: "Missing required 'path' query parameter" });
      return;
    }

    try {
      const repo = await repoService.getRepoById(repoId);
      if (!repo) {
        res.status(404).json({ error: "Repository not found" });
        return;
      }

      const file = await getFileByPath(repoId, filePath);
      if (!file) {
        res.status(404).json({ error: `File '${filePath}' not found in repository index` });
        return;
      }

      res.status(200).json({
        path: file.path,
        content: file.content || "",
        language: file.language,
        size: file.size,
        commitSha: file.latestSha || repo.currentCommitSha || "HEAD",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch file content" });
    }
  }

  /**
   * POST /api/repos/:repoId/retrieve-hybrid
   * Fused dense vector + BM25 keyword search with multi-factor scoring.
   */
  async retrieveHybrid(req: Request, res: Response): Promise<void> {
    const repoId = String(req.params.repoId);
    const { query, limit = 8, weights } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      res.status(400).json({ error: "Missing required 'query' string in request body" });
      return;
    }

    try {
      const response = await retrievalService.hybridRetrieve(
        repoId,
        query.trim(),
        Number(limit) || 8,
        weights,
      );
      res.status(200).json(response);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to execute hybrid retrieval" });
    }
  }

  /**
   * POST /api/repos/:repoId/evaluate
   * Executes evaluation benchmark comparing Dense, BM25, and Hybrid.
   */
  async runEvaluationBenchmark(req: Request, res: Response): Promise<void> {
    const repoId = String(req.params.repoId);
    const { weights } = req.body || {};

    try {
      const result = await evaluatorService.runBenchmark(repoId, weights);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to run evaluation benchmark" });
    }
  }
}

export const repoController = new RepoController();

