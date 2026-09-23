import { embeddingService } from "./embedding.service.js";
import { vectorService } from "./vector.service.js";
import { rerankerService } from "./reranker.service.js";
import type {
  VectorSearchQuery,
  VectorSearchResponse,
  ScoringWeights,
  HybridRetrievalResponse,
} from "@repomind/shared-types";

export class RetrievalService {
  /**
   * Retrieves relevant code chunks for a query strictly within a repository.
   */
  async retrieveChunks(params: VectorSearchQuery): Promise<VectorSearchResponse> {
    const startTime = Date.now();
    const { repositoryId, query, limit = 8, scoreThreshold = 0.1 } = params;

    if (!query || typeof query !== "string" || !query.trim()) {
      return {
        results: [],
        totalMatches: 0,
        queryLatencyMs: 0,
      };
    }

    // 1. Embed query
    const queryVector = await embeddingService.embedQuery(query.trim());

    // 2. Vector search strictly filtered by repositoryId
    const results = await vectorService.searchVectors(
      repositoryId,
      queryVector,
      limit,
      scoreThreshold,
    );

    const latency = Date.now() - startTime;
    console.log(
      `[RepoMind Retrieval] Query: "${query.substring(0, 40)}..." -> Found ${results.length} chunks in ${latency}ms (Repo: ${repositoryId})`,
    );

    return {
      results,
      totalMatches: results.length,
      queryLatencyMs: latency,
    };
  }

  /**
   * Hybrid retrieval combining dense vector search, sparse BM25, and multi-factor reranking.
   */
  async hybridRetrieve(
    repoId: string,
    query: string,
    limit: number = 8,
    customWeights?: Partial<ScoringWeights>,
  ): Promise<HybridRetrievalResponse> {
    const startTime = Date.now();
    const { results, weightsUsed } = await rerankerService.hybridRetrieve(
      repoId,
      query,
      limit,
      customWeights,
    );
    const latency = Date.now() - startTime;
    console.log(
      `[RepoMind Hybrid] Query: "${query.substring(0, 40)}..." -> Reranked ${results.length} chunks in ${latency}ms (Repo: ${repoId})`,
    );

    return {
      results,
      totalCandidates: results.length,
      weightsUsed,
      latencyMs: latency,
    };
  }
}

export const retrievalService = new RetrievalService();
