import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import { config } from "./config/env.js";
import { isDbConnected } from "./config/database.js";
import { authRouter } from "./modules/auth/auth.router.js";
import { orgRouter } from "./modules/orgs/org.router.js";
import { repoRouter } from "./modules/repos/repo.router.js";
import { ragRouter } from "./modules/rag/rag.router.js";
import { webhookRouter } from "./modules/webhooks/webhook.router.js";
import { intelligenceRouter } from "./modules/intelligence/intelligence.router.js";
import { enhancementsRouter } from "./modules/intelligence/enhancements.router.js";
import { graphRouter } from "./modules/architecture/graph.router.js";
import { observabilityRouter } from "./modules/observability/observability.router.js";
import { webSocketService } from "./modules/realtime/websocket.service.js";
import { correlationMiddleware } from "./middlewares/correlation.middleware.js";
import { generalRateLimiter } from "./middlewares/rate-limiter.middleware.js";
import { metricsService } from "./modules/observability/metrics.service.js";

export const app = express();

// Trust reverse proxy (Vercel, Cloudflare, AWS ALB) for secure cookies
app.set("trust proxy", 1);

// Request Correlation ID & Latency Metrics Tracking
app.use(correlationMiddleware);
app.use((_req, res, next) => {
  const start = Date.now();
  metricsService.incrementActiveRequests();
  res.on("finish", () => {
    metricsService.decrementActiveRequests();
    metricsService.recordRequest(Date.now() - start, res.statusCode);
  });
  next();
});

// Tiered Rate Limiting Middleware
app.use(generalRateLimiter);

// Security and utility middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        config.webUrl,
        "http://localhost:5173",
        "https://repomind-coral.vercel.app",
      ].filter(Boolean);
      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  }),
);

// Capture raw body for GitHub Webhook HMAC verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString("utf8");
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Express Session configuration with persistent MongoStore
const sessionStore = config.mongoUri
  ? MongoStore.create({
      mongoUrl: config.mongoUri,
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60, // 7 days
      autoRemove: "native",
      touchAfter: 24 * 3600, // lazy update every 24 hours
    })
  : undefined;

app.use(
  session({
    name: "repomind.sid",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days expiration
    },
  }),
);

// Modular Routes
app.use(observabilityRouter);
app.use("/api/auth", authRouter);
app.use("/api/orgs", orgRouter);
app.use("/api/repos", graphRouter);
app.use("/api/repos", intelligenceRouter);
app.use("/api/repos", enhancementsRouter);
app.use("/api/repos", ragRouter);
app.use("/api/repos", repoRouter);
app.use("/api/webhooks", webhookRouter);

// Healthcheck endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    service: "repomind-api",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    databaseConnected: isDbConnected(),
    qdrantTarget: config.qdrantUrl,
    websocketClients: webSocketService.getClientCount(),
  });
});

// Favicon handler to avoid 404 errors in browser console
app.get("/favicon.ico", (_req: Request, res: Response) => {
  res.status(204).end();
});

// Root API metadata route
app.get("/api", (_req: Request, res: Response) => {
  res.status(200).json({
    name: "RepoMind API",
    version: "0.1.0",
    docs: "/api/docs",
    modules: ["auth", "orgs", "repos", "ingestion", "rag", "webhooks", "realtime", "issues", "prs", "architecture"],
  });
});

// 404 handler for unmatched API endpoints
app.use("/api", (req: Request, res: Response) => {
  res.status(404).json({
    error: `Endpoint '${req.method} ${req.originalUrl}' not found`,
    code: "NOT_FOUND",
  });
});

// Centralized structured error handler
app.use((err: any, req: Request, res: Response, _next: express.NextFunction) => {
  const correlationId = (req as any).correlationId;
  const statusCode = typeof err.statusCode === "number" ? err.statusCode : (err.status || 500);
  const isProd = config.nodeEnv === "production";

  console.error(`[RepoMind API Error] [${correlationId || "no-correlation"}] ${req.method} ${req.url}:`, err);

  res.status(statusCode).json({
    error: statusCode === 500 && isProd ? "Internal server error" : (err.message || "An unexpected error occurred"),
    code: err.code || "INTERNAL_ERROR",
    ...(correlationId ? { correlationId } : {}),
    ...(isProd ? {} : { stack: err.stack }),
  });
});

export default app;
