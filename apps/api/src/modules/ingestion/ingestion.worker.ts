import crypto from "node:crypto";
import mongoose from "mongoose";
import { Worker, type Job } from "bullmq";
import { config } from "../../config/env.js";
import { INGESTION_QUEUE_NAME } from "./ingestion.queue.js";
import { RepositoryModel } from "../repos/models/repo.model.js";
import { FileModel } from "./models/file.model.js";
import { authService } from "../auth/auth.service.js";
import { repoService } from "../repos/repo.service.js";
import { chunkService } from "../chunking/chunk.service.js";
import { shouldIngestFile, detectLanguage } from "./filters/file-filter.js";
import { isDbConnected } from "../../config/database.js";
import { embeddingService } from "../retrieval/embedding.service.js";
import { vectorService } from "../retrieval/vector.service.js";
import type { IngestionJobPayload, FileRecord, ChunkRecord } from "@repomind/shared-types";

// In-memory file storage for offline local development
export const devFiles = new Map<string, FileRecord>();

/**
 * Computes SHA-256 hash of normalized file content.
 */
export function computeContentHash(content: string): string {
  // Normalize line endings to \n so hash is invariant across Windows/Unix
  const normalized = content.replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

/**
 * Ingestion Worker job processor.
 * Fetches tree, filters files, hashes content, and idempotently upserts File records.
 */
export async function processIngestionJob(payload: IngestionJobPayload): Promise<void> {
  const { repositoryId, userId } = payload;
  console.log(`[RepoMind Worker] >>> Starting ingestion for repository: ${repositoryId}`);

  let repo = await repoService.getRepoById(repositoryId);
  if (!repo) {
    throw new Error(`Repository ${repositoryId} not found`);
  }

  // 1. Transition status to "indexing"
  if (isDbConnected()) {
    await RepositoryModel.updateOne({ _id: new mongoose.Types.ObjectId(repositoryId) }, { indexStatus: "indexing" });
  }

  const token = await authService.getDecryptedToken(userId);
  let filesToIngest: Array<{ path: string; content: string; sha: string; size: number }> = [];
  let treeSha = `sha_${Date.now()}`;

  // 2. Fetch Git Tree & Blobs
  const isMockFixture = repo.fullName.startsWith("acme/") || repo.fullName.startsWith("repomind/");
  const hasLiveToken = Boolean(token && !token.startsWith("mock_ghp_"));

  if (!hasLiveToken && isMockFixture) {
    // Generate realistic source code repository files for development & testing
    console.log(`[RepoMind Worker] Using development repository fixtures for ${repo.fullName}`);
    treeSha = "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b";
    filesToIngest = [
      {
        path: "src/index.ts",
        content: `import express from "express";\n\nexport const app = express();\napp.get("/health", (req, res) => res.send("ok"));\napp.listen(3000);\n`,
        sha: "blob_sha_101",
        size: 135,
      },
      {
        path: "src/auth/service.ts",
        content: `export class AuthService {\n  validateUser(token: string): boolean {\n    return token.length > 10;\n  }\n}\n`,
        sha: "blob_sha_102",
        size: 110,
      },
      {
        path: "src/utils/crypto.ts",
        content: `import crypto from "crypto";\n\nexport function hashData(data: string): string {\n  return crypto.createHash("sha256").update(data).digest("hex");\n}\n`,
        sha: "blob_sha_103",
        size: 145,
      },
      {
        path: "README.md",
        content: `# ${repo.name}\n\nArchitecture intelligence repository indexed by RepoMind.\n`,
        sha: "blob_sha_104",
        size: 78,
      },
    ];
  } else {
    // Live GitHub API tree fetch
    const [owner, repoName] = repo.fullName.split("/");
    const treeUrl = `https://api.github.com/repos/${owner}/${repoName}/git/trees/${repo.branch}?recursive=1`;

    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoMind-IngestionWorker",
    };
    if (hasLiveToken) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    console.log(`[RepoMind Worker] Fetching real Git tree from GitHub for ${repo.fullName} (${repo.branch})...`);
    const treeRes = await fetch(treeUrl, { headers });

    if (!treeRes.ok) {
      throw new Error(`Failed to fetch Git tree from GitHub: HTTP ${treeRes.status}`);
    }

    const treeData = (await treeRes.json()) as any;
    treeSha = treeData.sha || treeSha;
    const treeItems: any[] = treeData.tree || [];

    // Filter tree
    const eligibleBlobs = treeItems.filter(
      (item) => item.type === "blob" && shouldIngestFile(item.path, item.size),
    );

    console.log(
      `[RepoMind Worker] Discovered ${treeItems.length} total items in tree, ${eligibleBlobs.length} eligible files after filtering for ${repo.fullName}.`,
    );

    // Download content for eligible blobs
    const blobHeaders: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoMind-IngestionWorker",
    };
    if (hasLiveToken) {
      blobHeaders["Authorization"] = `Bearer ${token}`;
    }

    for (const blob of eligibleBlobs) {
      try {
        const blobRes = await fetch(blob.url, { headers: blobHeaders });

        if (blobRes.ok) {
          const blobData = (await blobRes.json()) as any;
          const content = Buffer.from(blobData.content, "base64").toString("utf8");
          filesToIngest.push({
            path: blob.path,
            content,
            sha: blob.sha,
            size: blob.size || Buffer.byteLength(content, "utf8"),
          });
        }
      } catch (err: any) {
        console.warn(`[RepoMind Worker] Error downloading blob ${blob.path}:`, err.message);
      }
    }
  }

  // 3. Idempotently persist File records with SHA-256 content hashes
  console.log(`[RepoMind Worker] Ingesting ${filesToIngest.length} files into repository store...`);
  const activePaths = new Set<string>();
  const allGeneratedChunks: ChunkRecord[] = [];
  const filePathMap = new Map<string, string>();

  for (const file of filesToIngest) {
    activePaths.add(file.path);
    const contentHash = computeContentHash(file.content);
    const language = detectLanguage(file.path);

    if (!isDbConnected()) {
      const fileId = `file_${repositoryId}_${file.path.replace(/[^a-zA-Z0-9]/g, "_")}`;
      const now = new Date().toISOString();
      const fileRec: FileRecord = {
        id: fileId,
        repositoryId,
        path: file.path,
        language,
        contentHash,
        latestSha: file.sha,
        size: file.size,
        content: file.content,
        createdAt: now,
        updatedAt: now,
      };
      devFiles.set(fileId, fileRec);
      filePathMap.set(fileId, fileRec.path);

      // Trigger Phase 6 AST Chunking
      const chunks = await chunkService.processFileChunks(repo, fileRec);
      allGeneratedChunks.push(...chunks);
    } else {
      // Upsert into MongoDB
      const fileDoc = await FileModel.findOneAndUpdate(
        {
          repositoryId: new mongoose.Types.ObjectId(repositoryId),
          path: file.path,
        },
        {
          repositoryId: new mongoose.Types.ObjectId(repositoryId),
          path: file.path,
          language,
          contentHash,
          latestSha: file.sha,
          size: file.size,
          content: file.content,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      const clientRec = fileDoc.toClient();
      filePathMap.set(clientRec.id, clientRec.path);

      // Trigger Phase 6 AST Chunking
      const chunks = await chunkService.processFileChunks(repo, clientRec);
      allGeneratedChunks.push(...chunks);
    }
  }

  // Phase 7: Generate embeddings and upsert into Qdrant vector store
  if (allGeneratedChunks.length > 0) {
    console.log(`[RepoMind Worker] Generating vector embeddings for ${allGeneratedChunks.length} chunks...`);
    const embeddings = await embeddingService.embedChunks(allGeneratedChunks);
    await vectorService.upsertChunks(repositoryId, allGeneratedChunks, embeddings, filePathMap);
    console.log(`[RepoMind Worker] Successfully indexed ${allGeneratedChunks.length} chunks into vector store.`);
  }

  // 4. Clean up deleted files no longer in Git tree
  if (!isDbConnected()) {
    for (const [key, f] of devFiles.entries()) {
      if (f.repositoryId === repositoryId && !activePaths.has(f.path)) {
        devFiles.delete(key);
      }
    }
  } else {
    await FileModel.deleteMany({
      repositoryId: new mongoose.Types.ObjectId(repositoryId),
      path: { $nin: Array.from(activePaths) },
    });
  }

  // 5. Update Repository status to "indexed"
  const completedAt = new Date().toISOString();
  if (!isDbConnected()) {
    repo = {
      ...repo,
      indexStatus: "indexed",
      lastIndexedAt: completedAt,
      currentCommitSha: treeSha,
      updatedAt: completedAt,
    };
    repoService.setDevRepo(repo);
  } else {
    await RepositoryModel.updateOne(
      { _id: new mongoose.Types.ObjectId(repositoryId) },
      {
        indexStatus: "indexed",
        lastIndexedAt: new Date(),
        currentCommitSha: treeSha,
      },
    );
  }

  console.log(
    `[RepoMind Worker] <<< Ingestion COMPLETED for ${repo.fullName}: ${filesToIngest.length} files indexed (commit: ${treeSha.substring(0, 7)}).`,
  );
}

/**
 * Retrieves indexed files for a repository.
 */
export async function getRepoFiles(repositoryId: string): Promise<FileRecord[]> {
  if (!isDbConnected() || !mongoose.Types.ObjectId.isValid(repositoryId)) {
    const results: FileRecord[] = [];
    for (const f of devFiles.values()) {
      if (f.repositoryId === repositoryId) {
        results.push(f);
      }
    }
    return results;
  }

  const files = await FileModel.find({
    repositoryId: new mongoose.Types.ObjectId(repositoryId),
  }).sort({ path: 1 });

  return files.map((f) => f.toClient());
}

/**
 * Retrieves a single file record by path.
 */
export async function getFileByPath(repositoryId: string, filePath: string): Promise<FileRecord | null> {
  if (!isDbConnected() || !mongoose.Types.ObjectId.isValid(repositoryId)) {
    for (const f of devFiles.values()) {
      if (f.repositoryId === repositoryId && f.path === filePath) {
        return f;
      }
    }
    return null;
  }

  const doc = await FileModel.findOne({
    repositoryId: new mongoose.Types.ObjectId(repositoryId),
    path: filePath,
  });

  return doc ? doc.toClient() : null;
}

/**
 * Initializes and starts the BullMQ background worker if Redis is available.
 */
export function startIngestionWorker(): Worker<IngestionJobPayload> | null {
  try {
    const redisUrl = new URL(config.redisUrl);
    const worker = new Worker<IngestionJobPayload>(
      INGESTION_QUEUE_NAME,
      async (job: Job<IngestionJobPayload>) => {
        await processIngestionJob(job.data);
      },
      {
        connection: {
          host: redisUrl.hostname,
          port: Number(redisUrl.port) || 6379,
          maxRetriesPerRequest: null,
        },
        concurrency: 2,
      },
    );

    worker.on("completed", (job) => {
      console.log(`[RepoMind Worker] Ingestion job ${job.id} completed successfully.`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[RepoMind Worker] Ingestion job ${job?.id} failed:`, err.message);
    });

    console.log(`[RepoMind Worker] BullMQ Ingestion Worker listening on ${INGESTION_QUEUE_NAME}`);
    return worker;
  } catch (err: any) {
    console.warn(`[RepoMind Worker] Could not start BullMQ worker with Redis: ${err.message}`);
    return null;
  }
}
