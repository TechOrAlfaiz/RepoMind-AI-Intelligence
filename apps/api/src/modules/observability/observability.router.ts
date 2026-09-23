import { Router, type Request, type Response } from "express";
import { metricsService } from "./metrics.service.js";
import { auditService } from "../audit/audit.service.js";

const router = Router();

/**
 * GET /metrics
 * Standard Prometheus exposition format for external scraping agents.
 */
router.get("/metrics", (_req: Request, res: Response): void => {
  res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
  res.status(200).send(metricsService.getPrometheusMetrics());
});

/**
 * GET /api/metrics
 * Structured JSON representation of all system KPIs.
 */
router.get("/api/metrics", (_req: Request, res: Response): void => {
  res.status(200).json(metricsService.getMetrics());
});

/**
 * GET /api/audit-logs
 * Queries the centralized audit log trail.
 */
router.get("/api/audit-logs", async (req: Request, res: Response): Promise<void> => {
  const organizationId = req.query.organizationId as string | undefined;
  const repositoryId = req.query.repositoryId as string | undefined;
  const actorId = req.query.actorId as string | undefined;
  const action = req.query.action as string | undefined;
  const status = req.query.status as "success" | "failure" | "denied" | undefined;
  const limit = req.query.limit ? Number(req.query.limit) : 50;
  const skip = req.query.skip ? Number(req.query.skip) : 0;

  try {
    const results = await auditService.query({
      organizationId,
      repositoryId,
      actorId,
      action,
      status,
      limit,
      skip,
    });

    res.status(200).json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch audit logs" });
  }
});

export const observabilityRouter = router;
