import { Queue } from "bullmq";
import { config } from "../../config/env.js";
import { processIngestionJob } from "./ingestion.worker.js";
import type { IngestionJobPayload } from "@repomind/shared-types";

export const INGESTION_QUEUE_NAME = "repomind-ingestion-queue";

let ingestionQueue: Queue<IngestionJobPayload> | null = null;
let useRedis = false;

export function initQueue(): void {
  // Only attempt Redis connection if in production or explicit REDIS_ENABLED is set
  if (process.env.REDIS_ENABLED === "true") {
    try {
      const redisUrl = new URL(config.redisUrl);
      ingestionQueue = new Queue<IngestionJobPayload>(INGESTION_QUEUE_NAME, {
        connection: {
          host: redisUrl.hostname,
          port: Number(redisUrl.port) || 6379,
          connectTimeout: 2000,
          maxRetriesPerRequest: 2,
        },
      });

      ingestionQueue.on("error", (err) => {
        console.warn(`[RepoMind Queue] Redis queue disconnected, using in-process runner: ${err.message}`);
        useRedis = false;
      });

      useRedis = true;
    } catch {
      useRedis = false;
      ingestionQueue = null;
    }
  }
}

// Initialize on module load
initQueue();

/**
 * Non-negotiable: Long-running ingestion never blocks the HTTP request.
 * Enqueues an ingestion job and returns immediately.
 */
export async function addIngestionJob(repositoryId: string, userId: string): Promise<void> {
  const payload: IngestionJobPayload = {
    repositoryId,
    userId,
    triggeredAt: new Date().toISOString(),
  };

  console.log(`[RepoMind Queue] Enqueuing ingestion job for repository ${repositoryId}`);

  if (useRedis && ingestionQueue) {
    try {
      await ingestionQueue.add("ingest-repo", payload, {
        jobId: `ingest-${repositoryId}-${Date.now()}`,
      });
      console.log(`[RepoMind Queue] Job added to BullMQ Redis queue for repo: ${repositoryId}`);
      return;
    } catch (err: any) {
      console.warn(`[RepoMind Queue] Redis queue add failed: ${err.message}. Using async in-process fallback.`);
    }
  }

  // Asynchronous background runner fallback (runs off the HTTP thread without blocking)
  setImmediate(() => {
    processIngestionJob(payload).catch((err) => {
      console.error(`[RepoMind Ingestion] Background job failed for ${repositoryId}:`, err);
    });
  });
}
