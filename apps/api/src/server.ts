import { createServer } from "node:http";
import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import session from "express-session";
import { config } from "./config/env.js";
import { connectDatabase, disconnectDatabase, isDbConnected } from "./config/database.js";
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

const app = express();

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
    contentSecurityPolicy: config.nodeEnv === "production",
  }),
);

app.use(
  cors({
    origin: [config.webUrl, "http://localhost:5173"],
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

// Express Session configuration
app.use(
  session({
    name: "repomind.sid",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
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

// Root route: Redirect browser requests to the frontend web application (localhost:5173)
app.get("/", (req: Request, res: Response) => {
  if (req.accepts("html")) {
    return res.redirect(config.webUrl || "http://localhost:5173");
  }
  res.status(200).json({
    name: "RepoMind API",
    status: "online",
    version: "0.1.0",
    webUrl: config.webUrl || "http://localhost:5173",
    health: "/health",
    api: "/api",
  });
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

// Initialize database & start server
await connectDatabase();

const httpServer = createServer(app);
webSocketService.attach(httpServer);

const server = httpServer.listen(config.port, () => {
  console.log(`[RepoMind API] Server running in ${config.nodeEnv} on port ${config.port}`);
  console.log(`[RepoMind API] Health endpoint available at http://localhost:${config.port}/health`);
  console.log(`[RepoMind API] Auth routes available at http://localhost:${config.port}/api/auth`);
  console.log(`[RepoMind API] WebSocket server listening on ws://localhost:${config.port}/ws`);
  console.log(`[RepoMind API] Webhook endpoint listening at http://localhost:${config.port}/api/webhooks/github`);
});

// Graceful shutdown handling
const handleShutdown = async (signal: string) => {
  console.log(`\n[RepoMind API] Received ${signal}. Shutting down gracefully...`);
  await disconnectDatabase();
  server.close(() => {
    console.log("[RepoMind API] HTTP & WebSocket server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));

export default app;
