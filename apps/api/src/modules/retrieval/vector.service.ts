import crypto from "node:crypto";
import { qdrantClient } from "../../config/vector.js";
import { config } from "../../config/env.js";
import { formatContextualHeader } from "../chunking/parsers/ast-chunker.js";
import type { ChunkRecord, RetrievedChunk, VectorPayload } from "@repomind/shared-types";

export interface StoredVectorPoint {
  id: string;
  vector: number[];
  payload: VectorPayload;
}

/**
 * Calculates cosine similarity between two normalized vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
  }
  return dotProduct;
}

/**
 * Deterministic UUID generator from chunk ID for Qdrant point IDs (which require valid UUIDs or integers).
 */
function chunkIdToUUID(chunkId: string): string {
  const hash = crypto.createHash("md5").update(chunkId).digest("hex");
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
}

/**
 * In-memory vector store for offline local development and automated testing.
 */
class DevVectorStore {
  private points = new Map<string, StoredVectorPoint>();

  upsert(points: StoredVectorPoint[]) {
    for (const pt of points) {
      this.points.set(pt.id, pt);
    }
  }

  deleteByRepo(repositoryId: string) {
    for (const [key, pt] of this.points.entries()) {
      if (pt.payload.repositoryId === repositoryId) {
        this.points.delete(key);
      }
    }
  }

  deleteByFile(repositoryId: string, filePath: string) {
    for (const [key, pt] of this.points.entries()) {
      if (pt.payload.repositoryId === repositoryId && pt.payload.filePath === filePath) {
        this.points.delete(key);
      }
    }
  }

  hasChunk(chunkId: string): boolean {
    for (const pt of this.points.values()) {
      if (pt.payload.chunkId === chunkId) return true;
    }
    return false;
  }

  hasFile(repositoryId: string, filePath: string): boolean {
    for (const pt of this.points.values()) {
      if (pt.payload.repositoryId === repositoryId && pt.payload.filePath === filePath) return true;
    }
    return false;
  }

  search(
    repositoryId: string,
    queryVector: number[],
    limit: number,
    scoreThreshold: number,
  ): RetrievedChunk[] {
    const candidates: Array<{ point: StoredVectorPoint; score: number }> = [];

    for (const pt of this.points.values()) {
      // STRICT REPOSITORY SCOPING
      if (pt.payload.repositoryId !== repositoryId) {
        continue;
      }

      const score = cosineSimilarity(queryVector, pt.vector);
      if (score >= scoreThreshold) {
        candidates.push({ point: pt, score });
      }
    }

    // Sort descending by similarity score
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, limit).map(({ point, score }) => ({
      chunkId: point.payload.chunkId,
      repositoryId: point.payload.repositoryId,
      fileId: point.payload.fileId,
      filePath: point.payload.filePath,
      symbolName: point.payload.symbolName || undefined,
      chunkType: point.payload.chunkType,
      startLine: point.payload.startLine,
      endLine: point.payload.endLine,
      content: point.payload.content,
      contextualHeader: point.payload.contextualHeader,
      language: point.payload.language,
      score: Math.round(score * 10000) / 10000,
    }));
  }

  countRepo(repositoryId: string): number {
    let count = 0;
    for (const pt of this.points.values()) {
      if (pt.payload.repositoryId === repositoryId) count++;
    }
    return count;
  }
}

export const devVectorStore = new DevVectorStore();

/**
 * Vector Service managing Qdrant collection and vector similarity operations.
 */
export class VectorService {
  private collectionName = config.qdrantCollectionName;
  private collectionInitialized = false;
  private qdrantAvailable: boolean | null = null;

  /**
   * Checks if Qdrant is live and reachable.
   */
  async isQdrantHealthy(): Promise<boolean> {
    if (this.qdrantAvailable !== null) return this.qdrantAvailable;
    try {
      const collections = await qdrantClient.getCollections();
      this.qdrantAvailable = true;
      return true;
    } catch {
      this.qdrantAvailable = false;
      return false;
    }
  }

  /**
   * Ensures the Qdrant vector collection and payload indexes exist.
   */
  async ensureCollection(dimensions = 1536): Promise<void> {
    if (this.collectionInitialized) return;

    const isLive = await this.isQdrantHealthy();
    if (!isLive) {
      console.log(`[RepoMind Vector] Qdrant offline. Utilizing in-memory DevVectorStore.`);
      this.collectionInitialized = true;
      return;
    }

    try {
      const collections = await qdrantClient.getCollections();
      const exists = collections.collections.some((c) => c.name === this.collectionName);

      if (!exists) {
        console.log(`[RepoMind Vector] Creating collection '${this.collectionName}' (${dimensions} dims, Cosine)...`);
        await qdrantClient.createCollection(this.collectionName, {
          vectors: {
            size: dimensions,
            distance: "Cosine",
          },
        });

        // Create payload schema indexes for fast filtered searches
        await qdrantClient.createPayloadIndex(this.collectionName, {
          field_name: "repositoryId",
          field_schema: "keyword",
        });
        await qdrantClient.createPayloadIndex(this.collectionName, {
          field_name: "fileId",
          field_schema: "keyword",
        });
        await qdrantClient.createPayloadIndex(this.collectionName, {
          field_name: "symbolName",
          field_schema: "keyword",
        });
        await qdrantClient.createPayloadIndex(this.collectionName, {
          field_name: "language",
          field_schema: "keyword",
        });
      }

      this.collectionInitialized = true;
    } catch (err: any) {
      console.warn(`[RepoMind Vector] Note: Failed initializing Qdrant collection: ${err.message}. Falling back to in-memory store.`);
      this.qdrantAvailable = false;
      this.collectionInitialized = true;
    }
  }

  /**
   * Upserts chunk embeddings and payload metadata into Qdrant (and DevVectorStore).
   */
  async upsertChunks(
    repositoryId: string,
    chunks: ChunkRecord[],
    embeddings: number[][],
    filePathMap: Map<string, string>,
  ): Promise<void> {
    if (chunks.length === 0) return;

    await this.ensureCollection(embeddings[0]?.length || 1536);

    const points: StoredVectorPoint[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const vector = embeddings[i];
      const filePath = filePathMap.get(chunk.fileId) || chunk.header.path;
      const contextualHeaderStr = formatContextualHeader(chunk.header);

      const payload: VectorPayload = {
        chunkId: chunk.id,
        repositoryId: chunk.repositoryId,
        fileId: chunk.fileId,
        filePath,
        symbolName: chunk.symbolName || "",
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        chunkType: chunk.chunkType,
        language: chunk.header.language,
        contentHash: chunk.contentHash,
        content: chunk.content,
        contextualHeader: contextualHeaderStr,
      };

      const pointId = chunkIdToUUID(chunk.id);
      points.push({
        id: pointId,
        vector,
        payload,
      });
    }

    // Always keep dev store synchronized
    devVectorStore.upsert(points);

    if (await this.isQdrantHealthy()) {
      try {
        await qdrantClient.upsert(this.collectionName, {
          wait: true,
          points: points.map((p) => ({
            id: p.id,
            vector: p.vector,
            payload: p.payload as unknown as Record<string, unknown>,
          })),
        });
        console.log(`[RepoMind Vector] Upserted ${points.length} vector points to Qdrant.`);
      } catch (err: any) {
        console.warn(`[RepoMind Vector] Qdrant upsert failed (${err.message}). Cached in DevVectorStore.`);
      }
    } else {
      console.log(`[RepoMind Vector] Saved ${points.length} vector points to in-memory DevVectorStore.`);
    }
  }

  /**
   * Searches for top-k similar chunks strictly scoped to a single repositoryId.
   */
  async searchVectors(
    repositoryId: string,
    queryVector: number[],
    limit = 8,
    scoreThreshold = 0.1,
  ): Promise<RetrievedChunk[]> {
    await this.ensureCollection(queryVector.length);

    if (await this.isQdrantHealthy()) {
      try {
        const results = await qdrantClient.query(this.collectionName, {
          query: queryVector,
          limit,
          score_threshold: scoreThreshold,
          // CRITICAL NON-NEGOTIABLE: Strict Repository Scope Filter
          filter: {
            must: [
              {
                key: "repositoryId",
                match: { value: repositoryId },
              },
            ],
          },
          with_payload: true,
        });

        return results.points.map((res: any) => {
          const p = res.payload as unknown as VectorPayload;
          return {
            chunkId: p.chunkId,
            repositoryId: p.repositoryId,
            fileId: p.fileId,
            filePath: p.filePath,
            symbolName: p.symbolName || undefined,
            chunkType: p.chunkType,
            startLine: p.startLine,
            endLine: p.endLine,
            content: p.content,
            contextualHeader: p.contextualHeader,
            language: p.language,
            score: Math.round(res.score * 10000) / 10000,
          };
        });
      } catch (err: any) {
        console.warn(`[RepoMind Vector] Qdrant search error (${err.message}). Falling back to DevVectorStore.`);
      }
    }

    // Dev store fallback
    return devVectorStore.search(repositoryId, queryVector, limit, scoreThreshold);
  }

  /**
   * Cascading vector deletion for repository.
   */
  async deleteRepoVectors(repositoryId: string): Promise<void> {
    devVectorStore.deleteByRepo(repositoryId);
    if (await this.isQdrantHealthy()) {
      try {
        await qdrantClient.delete(this.collectionName, {
          filter: {
            must: [
              {
                key: "repositoryId",
                match: { value: repositoryId },
              },
            ],
          },
        });
      } catch (err: any) {
        console.warn(`[RepoMind Vector] Failed to delete Qdrant vectors: ${err.message}`);
      }
    }
  }

  /**
   * Deletes all vector points associated with a specific file within a repository.
   */
  async deleteFileVectors(repositoryId: string, filePath: string): Promise<void> {
    devVectorStore.deleteByFile(repositoryId, filePath);
    if (await this.isQdrantHealthy()) {
      try {
        await qdrantClient.delete(this.collectionName, {
          filter: {
            must: [
              { key: "repositoryId", match: { value: repositoryId } },
              { key: "filePath", match: { value: filePath } },
            ],
          },
        });
      } catch (err: any) {
        console.warn(`[RepoMind Vector] Failed to delete Qdrant file vectors: ${err.message}`);
      }
    }
  }
}

export const vectorService = new VectorService();
