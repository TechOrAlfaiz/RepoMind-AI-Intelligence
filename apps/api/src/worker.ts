import { config } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { startIngestionWorker } from "./modules/ingestion/ingestion.worker.js";

console.log("[RepoMind Worker] Starting background worker process...");
console.log(`[RepoMind Worker] Redis target: ${config.redisUrl}`);

await connectDatabase();

const worker = startIngestionWorker();

// Graceful shutdown handling for worker
const handleWorkerShutdown = async (signal: string) => {
  console.log(`\n[RepoMind Worker] Received ${signal}. Shutting down worker...`);
  if (worker) {
    await worker.close();
  }
  await disconnectDatabase();
  process.exit(0);
};

process.on("SIGINT", () => handleWorkerShutdown("SIGINT"));
process.on("SIGTERM", () => handleWorkerShutdown("SIGTERM"));

console.log("[RepoMind Worker] Worker initialized and ready for ingestion jobs.");
