import type { Request, Response, NextFunction } from "express";

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

interface RateLimitRecord {
  timestamps: number[];
}

export class InMemoryRateLimiter {
  private hits = new Map<string, RateLimitRecord>();
  private blockedCount = 0;

  createMiddleware(config: RateLimitConfig) {
    const {
      windowMs,
      max,
      message = "Too Many Requests. Please try again later.",
      keyGenerator = (req) =>
        req.ip || req.headers["x-forwarded-for"]?.toString() || req.socket.remoteAddress || "127.0.0.1",
    } = config;

    return (req: Request, res: Response, next: NextFunction): void => {
      const now = Date.now();
      const key = keyGenerator(req);
      const windowStart = now - windowMs;

      let record = this.hits.get(key);
      if (!record) {
        record = { timestamps: [] };
        this.hits.set(key, record);
      }

      // Filter out timestamps outside the active window
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

      const currentCount = record.timestamps.length;
      const remaining = Math.max(0, max - currentCount - 1);
      const resetTimeSeconds = Math.ceil(
        ((record.timestamps[0] || now) + windowMs - now) / 1000,
      );

      // Set standard RFC rate limit headers
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", Math.max(1, resetTimeSeconds));

      if (currentCount >= max) {
        this.blockedCount++;
        res.setHeader("Retry-After", Math.max(1, resetTimeSeconds));
        res.status(429).json({
          error: "Too Many Requests",
          message,
          retryAfterSeconds: Math.max(1, resetTimeSeconds),
          correlationId: req.correlationId,
        });
        return;
      }

      record.timestamps.push(now);
      next();
    };
  }

  getStats() {
    return {
      blockedRequests: this.blockedCount,
      activeTrackedKeys: this.hits.size,
    };
  }

  reset() {
    this.hits.clear();
    this.blockedCount = 0;
  }
}

export const rateLimiterRegistry = new InMemoryRateLimiter();

// General API rate limiter: 120 req / minute
export const generalRateLimiter = rateLimiterRegistry.createMiddleware({
  windowMs: 60 * 1000,
  max: 120,
  message: "Rate limit exceeded (120 requests/minute). Please slow down.",
});

// Heavy RAG & AI Operations limiter: 30 req / minute
export const ragRateLimiter = rateLimiterRegistry.createMiddleware({
  windowMs: 60 * 1000,
  max: 30,
  message: "AI compute rate limit exceeded (30 queries/minute).",
  keyGenerator: (req) => {
    const userId = (req as any).session?.user?.id || (req as any).user?.id;
    return userId ? `user:${userId}` : `ip:${req.ip || "127.0.0.1"}`;
  },
});
