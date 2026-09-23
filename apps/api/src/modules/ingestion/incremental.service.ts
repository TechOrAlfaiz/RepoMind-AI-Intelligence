import mongoose from "mongoose";
import { isDbConnected } from "../../config/database.js";
import { FileModel } from "./models/file.model.js";
import { RepositoryModel } from "../repos/models/repo.model.js";
import { repoService, devRepos } from "../repos/repo.service.js";
import { devFiles, computeContentHash } from "./ingestion.worker.js";
import { shouldIngestFile, detectLanguage } from "./filters/file-filter.js";
import { chunkService } from "../chunking/chunk.service.js";
import { embeddingService } from "../retrieval/embedding.service.js";
import { vectorService } from "../retrieval/vector.service.js";
import { webSocketService } from "../realtime/websocket.service.js";
import type { PushWebhookCommitDiff, FileRecord, ChunkRecord } from "@repomind/shared-types";

export interface IncrementalResult {
  repositoryId: string;
  filesAdded: number;
  filesModified: number;
  filesRemoved: number;
  filesSkippedUnchanged: number;
  chunksCreated: number;
  chunksRemoved: number;
  newCommitSha: string;
}

export class IncrementalService {
  /**
   * Processes an incremental push event diff:
   * Only changed, added, or removed files are processed. Unchanged files are never re-indexed.
   */
  async processIncrementalPush(
    repoId: string,
    diff: PushWebhookCommitDiff,
    fetchContentFn?: (filePath: string) => Promise<string | null>,
  ): Promise<IncrementalResult> {
    const repo = await repoService.getRepoById(repoId);
    if (!repo) {
      throw new Error(`Repository ${repoId} not found`);
    }

    const totalChanges = diff.added.length + diff.modified.length + diff.removed.length;
    console.log(
      `[RepoMind Incremental] Starting push diff for repo ${repo.name}: +${diff.added.length} ~${diff.modified.length} -${diff.removed.length}`,
    );

    webSocketService.broadcastProgress({
      repositoryId: repoId,
      stage: "filtering",
      processedFiles: 0,
      totalFiles: Math.max(totalChanges, 1),
      percent: 10,
      message: `Analyzing push diff (+${diff.added.length}, ~${diff.modified.length}, -${diff.removed.length})`,
    });

    let filesAdded = 0;
    let filesModified = 0;
    let filesRemoved = 0;
    let filesSkippedUnchanged = 0;
    let chunksCreated = 0;
    let chunksRemoved = 0;

    // 1. Process Removed Files
    for (const filePath of diff.removed) {
      const file = await this.findFile(repoId, filePath);
      if (file) {
        // Delete vector embeddings
        await vectorService.deleteFileVectors(repoId, filePath);

        // Delete AST chunks
        const deletedChunkIds = await chunkService.deleteChunksByFileId(repoId, file.id);
        chunksRemoved += deletedChunkIds.length;

        // Delete FileRecord
        await this.deleteFileRecord(repoId, file.id, filePath);
        filesRemoved++;
        console.log(`[RepoMind Incremental] Removed file & chunks: ${filePath}`);
      }
    }

    webSocketService.broadcastProgress({
      repositoryId: repoId,
      stage: "chunking",
      processedFiles: filesRemoved,
      totalFiles: Math.max(totalChanges, 1),
      percent: 40,
      message: `Removed ${filesRemoved} deleted files`,
    });

    // Helper to get file content (uses provided function or mock/local source)
    const getContent = async (path: string): Promise<string | null> => {
      if (fetchContentFn) {
        return await fetchContentFn(path);
      }
      return `// Updated content for ${path}\nexport const updated = true;`;
    };

    // 2. Process Modified Files
    for (const filePath of diff.modified) {
      if (!shouldIngestFile(filePath)) {
        continue;
      }

      const existingFile = await this.findFile(repoId, filePath);
      const newContent = await getContent(filePath);

      if (newContent === null) {
        continue;
      }

      const newHash = computeContentHash(newContent);

      // Invariant: skip if content hash matches (zero wasted compute)
      if (existingFile && existingFile.contentHash === newHash) {
        filesSkippedUnchanged++;
        console.log(`[RepoMind Incremental] Skipped unmodified content: ${filePath}`);
        continue;
      }

      // If content actually changed, purge old chunks & vectors, then re-index
      if (existingFile) {
        await vectorService.deleteFileVectors(repoId, filePath);
        const deletedChunkIds = await chunkService.deleteChunksByFileId(repoId, existingFile.id);
        chunksRemoved += deletedChunkIds.length;
      }

      // Upsert updated FileRecord
      const language = detectLanguage(filePath);
      const updatedFileRec: FileRecord = {
        id: existingFile?.id || `file_${repoId}_${filePath.replace(/[^\w]/g, "_")}`,
        repositoryId: repoId,
        path: filePath,
        language,
        contentHash: newHash,
        latestSha: diff.afterSha || "HEAD",
        size: Buffer.byteLength(newContent, "utf8"),
        content: newContent,
        createdAt: existingFile?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.saveFileRecord(updatedFileRec);
      filesModified++;

      // Generate new AST chunks
      const newChunks = await chunkService.processFileChunks(repo, updatedFileRec);
      chunksCreated += newChunks.length;

      // Generate vector embeddings & upsert
      if (newChunks.length > 0) {
        const embeddings = await embeddingService.embedChunks(newChunks);
        const pathMap = new Map<string, string>([[updatedFileRec.id, filePath]]);
        await vectorService.upsertChunks(repoId, newChunks, embeddings, pathMap);
      }
    }

    webSocketService.broadcastProgress({
      repositoryId: repoId,
      stage: "embedding",
      processedFiles: filesRemoved + filesModified,
      totalFiles: Math.max(totalChanges, 1),
      percent: 75,
      message: `Re-indexed ${filesModified} modified files`,
    });

    // 3. Process Added Files
    for (const filePath of diff.added) {
      if (!shouldIngestFile(filePath)) {
        continue;
      }

      const newContent = await getContent(filePath);
      if (newContent === null) {
        continue;
      }

      const contentHash = computeContentHash(newContent);
      const language = detectLanguage(filePath);

      const newFileRec: FileRecord = {
        id: `file_${repoId}_${filePath.replace(/[^\w]/g, "_")}`,
        repositoryId: repoId,
        path: filePath,
        language,
        contentHash,
        latestSha: diff.afterSha || "HEAD",
        size: Buffer.byteLength(newContent, "utf8"),
        content: newContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.saveFileRecord(newFileRec);
      filesAdded++;

      // Generate AST chunks
      const newChunks = await chunkService.processFileChunks(repo, newFileRec);
      chunksCreated += newChunks.length;

      // Generate embeddings and upsert
      if (newChunks.length > 0) {
        const embeddings = await embeddingService.embedChunks(newChunks);
        const pathMap = new Map<string, string>([[newFileRec.id, filePath]]);
        await vectorService.upsertChunks(repoId, newChunks, embeddings, pathMap);
      }
    }

    // 4. Update Repository Metadata (Commit SHA, Last Indexed Timestamp)
    const newCommitSha: string = diff.afterSha || (repo.currentCommitSha ?? "") || "HEAD";
    if (!isDbConnected()) {
      const devRepo = devRepos.get(repoId);
      if (devRepo) {
        devRepo.currentCommitSha = newCommitSha;
        devRepo.lastIndexedAt = new Date().toISOString();
        devRepo.updatedAt = new Date().toISOString();
      }
    } else {
      await RepositoryModel.updateOne(
        { _id: new mongoose.Types.ObjectId(repoId) },
        {
          currentCommitSha: newCommitSha,
          lastIndexedAt: new Date(),
          updatedAt: new Date(),
        },
      );
    }

    // 5. Broadcast Final Completion
    webSocketService.broadcastProgress({
      repositoryId: repoId,
      stage: "completed",
      processedFiles: Math.max(totalChanges, 1),
      totalFiles: Math.max(totalChanges, 1),
      percent: 100,
      message: `Incremental push indexing complete (${newCommitSha.substring(0, 7)})`,
    });

    return {
      repositoryId: repoId,
      filesAdded,
      filesModified,
      filesRemoved,
      filesSkippedUnchanged,
      chunksCreated,
      chunksRemoved,
      newCommitSha,
    };
  }

  private async findFile(repoId: string, filePath: string): Promise<FileRecord | null> {
    if (!isDbConnected()) {
      for (const f of devFiles.values()) {
        if (f.repositoryId === repoId && f.path === filePath) {
          return f;
        }
      }
      return null;
    }

    const doc = await FileModel.findOne({
      repositoryId: new mongoose.Types.ObjectId(repoId),
      path: filePath,
    });
    return doc ? doc.toClient() : null;
  }

  private async saveFileRecord(fileRec: FileRecord): Promise<void> {
    if (!isDbConnected()) {
      devFiles.set(fileRec.id, fileRec);
      return;
    }

    await FileModel.findOneAndUpdate(
      {
        repositoryId: new mongoose.Types.ObjectId(fileRec.repositoryId),
        path: fileRec.path,
      },
      fileRec,
      { upsert: true, new: true },
    );
  }

  private async deleteFileRecord(repoId: string, fileId: string, filePath: string): Promise<void> {
    if (!isDbConnected()) {
      devFiles.delete(fileId);
      devFiles.delete(`${repoId}:${filePath}`);
      for (const [key, f] of devFiles.entries()) {
        if (f.id === fileId || (f.repositoryId === repoId && f.path === filePath)) {
          devFiles.delete(key);
        }
      }
      return;
    }

    await FileModel.deleteOne({
      repositoryId: new mongoose.Types.ObjectId(repoId),
      path: filePath,
    });
  }
}

export const incrementalService = new IncrementalService();
