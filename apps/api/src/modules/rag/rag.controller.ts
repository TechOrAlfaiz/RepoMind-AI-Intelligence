import type { Request, Response } from "express";
import { ragService } from "./rag.service.js";
import type { StreamEvent } from "@repomind/shared-types";

export class RAGController {
  /**
   * POST /api/repos/:repoId/chat
   * Streaming or batch RAG chat endpoint with strict citation validation.
   */
  async chat(req: Request, res: Response): Promise<void> {
    const repoId = String(req.params.repoId);
    const orgId =
      req.organization?.id ||
      req.repository?.organizationId ||
      String(req.headers["x-organization-id"] || "");
    const { query, conversationId, activeFilePath } = req.body;

    if (!query || typeof query !== "string" || !query.trim()) {
      res.status(400).json({ error: "Missing or empty query string" });
      return;
    }

    const isSSE = req.headers.accept?.includes("text/event-stream");

    if (isSSE) {
      // Set SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      try {
        await ragService.streamRAGChat(
          {
            organizationId: orgId,
            repositoryId: repoId,
            userId: req.user!.id,
            query: query.trim(),
            conversationId,
            activeFilePath: typeof activeFilePath === "string" ? activeFilePath : undefined,
          },
          (event: StreamEvent) => {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          },
        );
        res.end();
      } catch (err: any) {
        console.error("[RepoMind RAG] Streaming error:", err.message);
        res.write(`data: ${JSON.stringify({ type: "error", payload: err.message })}\n\n`);
        res.end();
      }
    } else {
      // Standard JSON response
      try {
        const result = await ragService.streamRAGChat(
          {
            organizationId: orgId,
            repositoryId: repoId,
            userId: req.user!.id,
            query: query.trim(),
            conversationId,
            activeFilePath: typeof activeFilePath === "string" ? activeFilePath : undefined,
          },
          () => {},
        );
        res.status(200).json(result);
      } catch (err: any) {
        res.status(500).json({ error: err.message || "RAG query failed" });
      }
    }
  }

  /**
   * GET /api/repos/:repoId/conversations
   */
  async listConversations(req: Request, res: Response): Promise<void> {
    const repoId = String(req.params.repoId);
    try {
      const list = await ragService.listConversations(repoId, req.user!.id);
      res.status(200).json({ conversations: list });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to list conversations" });
    }
  }

  /**
   * GET /api/repos/:repoId/conversations/:convoId/messages
   */
  async getMessages(req: Request, res: Response): Promise<void> {
    const convoId = String(req.params.convoId);
    try {
      const messages = await ragService.getMessages(convoId);
      res.status(200).json({ messages });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to get messages" });
    }
  }
}

export const ragController = new RAGController();
