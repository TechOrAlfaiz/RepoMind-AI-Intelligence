import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

/**
 * Correlation ID Middleware:
 * Extracts or generates a unique correlation ID for every incoming request.
 * Attaches to req.correlationId and X-Correlation-ID response header.
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId =
    (req.headers["x-correlation-id"] as string) ||
    (req.headers["x-request-id"] as string) ||
    crypto.randomUUID();

  req.correlationId = correlationId;
  res.setHeader("X-Correlation-ID", correlationId);

  next();
}
