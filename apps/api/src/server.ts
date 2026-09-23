import { createServer } from "node:http";
import type { Request, Response } from "express";
import { app } from "./app.js";
import { config } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { webSocketService } from "./modules/realtime/websocket.service.js";

// Root route: Redirect browser requests to the frontend web application
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
