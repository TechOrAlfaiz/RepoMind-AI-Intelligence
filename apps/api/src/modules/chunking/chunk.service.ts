import mongoose from "mongoose";
import { ChunkModel, type IChunkDocument } from "./models/chunk.model.js";
import { chunkCodeFile, type ParsedChunk } from "./parsers/ast-chunker.js";
import { isDbConnected } from "../../config/database.js";
import type { Repository, FileRecord, ChunkRecord } from "@repomind/shared-types";

// In-memory chunks store for offline local development
export const devChunks = new Map<string, ChunkRecord>();

export class ChunkService {
  /**
   * Parses a file using language-specific AST chunking and idempotently persists Chunk records.
   */
  async processFileChunks(repo: Repository, file: FileRecord): Promise<ChunkRecord[]> {
    if (!file.content) {
      return [];
    }

    const parsedChunks = chunkCodeFile(repo.name, file.path, file.language, file.content);
    const persistedChunks: ChunkRecord[] = [];

    for (const chunk of parsedChunks) {
      if (!isDbConnected()) {
        const chunkId = `chunk_${file.id}_${chunk.startLine}_${chunk.endLine}`;
        const record: ChunkRecord = {
          id: chunkId,
          repositoryId: repo.id,
          fileId: file.id,
          symbolName: chunk.symbolName,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          content: chunk.content,
          contentHash: chunk.contentHash,
          chunkType: chunk.chunkType,
          embeddingVersion: 1,
          header: chunk.header,
          createdAt: new Date().toISOString(),
        };

        devChunks.set(chunkId, record);
        persistedChunks.push(record);
      } else {
        // Upsert into MongoDB
        const doc = await ChunkModel.findOneAndUpdate(
          {
            repositoryId: new mongoose.Types.ObjectId(repo.id),
            fileId: new mongoose.Types.ObjectId(file.id),
            startLine: chunk.startLine,
            endLine: chunk.endLine,
          },
          {
            repositoryId: new mongoose.Types.ObjectId(repo.id),
            fileId: new mongoose.Types.ObjectId(file.id),
            symbolName: chunk.symbolName,
            startLine: chunk.startLine,
            endLine: chunk.endLine,
            content: chunk.content,
            contentHash: chunk.contentHash,
            chunkType: chunk.chunkType,
            embeddingVersion: 1,
            header: chunk.header,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );

        persistedChunks.push(doc.toClient());
      }
    }

    console.log(
      `[RepoMind Chunking] Extracted ${persistedChunks.length} AST chunks from ${file.path} [${file.language}]`,
    );
    return persistedChunks;
  }

  /**
   * Retrieves all chunks for a repository.
   */
  async getRepoChunks(repoId: string): Promise<ChunkRecord[]> {
    if (!isDbConnected() || !mongoose.Types.ObjectId.isValid(repoId)) {
      const results: ChunkRecord[] = [];
      for (const c of devChunks.values()) {
        if (c.repositoryId === repoId) results.push(c);
      }
      return results;
    }

    const docs = await ChunkModel.find({
      repositoryId: new mongoose.Types.ObjectId(repoId),
    }).sort({ startLine: 1 });

    return docs.map((d) => d.toClient());
  }

  /**
   * Deletes all chunks for a repository.
   */
  async deleteRepoChunks(repoId: string): Promise<void> {
    if (!isDbConnected()) {
      for (const [key, c] of devChunks.entries()) {
        if (c.repositoryId === repoId) devChunks.delete(key);
      }
      return;
    }

    await ChunkModel.deleteMany({
      repositoryId: new mongoose.Types.ObjectId(repoId),
    });
  }

  /**
   * Deletes all chunks associated with a specific file within a repository.
   */
  async deleteChunksByFileId(repoId: string, fileId: string): Promise<string[]> {
    if (!isDbConnected()) {
      const deletedIds: string[] = [];
      for (const [key, c] of devChunks.entries()) {
        if (c.repositoryId === repoId && c.fileId === fileId) {
          deletedIds.push(c.id);
          devChunks.delete(key);
        }
      }
      return deletedIds;
    }

    const docs = await ChunkModel.find({
      repositoryId: new mongoose.Types.ObjectId(repoId),
      fileId: new mongoose.Types.ObjectId(fileId),
    });

    const deletedIds = docs.map((d) => d._id.toString());
    await ChunkModel.deleteMany({
      repositoryId: new mongoose.Types.ObjectId(repoId),
      fileId: new mongoose.Types.ObjectId(fileId),
    });

    return deletedIds;
  }
}

export const chunkService = new ChunkService();
