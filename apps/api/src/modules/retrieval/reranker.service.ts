import type {
  ScoringWeights,
  ChunkScoreBreakdown,
  ScoredChunk,
  RetrievedChunk,
} from "@repomind/shared-types";
import { bm25Index, tokenizeCode, type BM25Hit } from "./bm25.service.js";
import { vectorService } from "./vector.service.js";
import { embeddingService } from "./embedding.service.js";
import { formatContextualHeader } from "../chunking/parsers/ast-chunker.js";

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  vectorWeight: 0.45,
  keywordWeight: 0.25,
  symbolWeight: 0.15,
  pathWeight: 0.10,
  recencyWeight: 0.05,
};

export class RerankerService {
  /**
   * Computes symbol match score [0.0 - 1.0] by checking if query tokens
   * match the AST symbolName or definition signature.
   */
  computeSymbolMatchScore(queryTokens: string[], symbolName?: string): number {
    if (!symbolName || queryTokens.length === 0) return 0;
    const lowerSymbol = symbolName.toLowerCase();
    const symbolParts = tokenizeCode(symbolName);

    // Exact full symbol match
    for (const q of queryTokens) {
      if (q === lowerSymbol) return 1.0;
    }

    // Partial match on sub-tokens (e.g. query "vault" matches "encryptVaultToken")
    let matchCount = 0;
    for (const part of symbolParts) {
      if (queryTokens.includes(part)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      return Math.min(0.9, 0.4 + 0.25 * matchCount);
    }

    return 0;
  }

  /**
   * Computes path match score [0.0 - 1.0] by checking if query terms match directory or file names.
   */
  computePathMatchScore(queryTokens: string[], filePath: string): number {
    if (!filePath || queryTokens.length === 0) return 0;
    const pathTokens = tokenizeCode(filePath);

    let matchCount = 0;
    for (const p of pathTokens) {
      if (queryTokens.includes(p)) {
        matchCount++;
      }
    }

    if (matchCount >= 2) return 1.0;
    if (matchCount === 1) return 0.6;
    return 0;
  }

  /**
   * Merges, scores, and reranks dense vector candidates and sparse BM25 candidates.
   */
  async hybridRetrieve(
    repoId: string,
    query: string,
    limit: number = 8,
    customWeights?: Partial<ScoringWeights>,
  ): Promise<{ results: ScoredChunk[]; weightsUsed: ScoringWeights }> {
    const weights: ScoringWeights = {
      ...DEFAULT_SCORING_WEIGHTS,
      ...(customWeights || {}),
    };

    // Normalize weights to sum to 1.0
    const weightSum =
      weights.vectorWeight +
      weights.keywordWeight +
      weights.symbolWeight +
      weights.pathWeight +
      weights.recencyWeight;

    const normalizedWeights: ScoringWeights =
      weightSum > 0
        ? {
            vectorWeight: weights.vectorWeight / weightSum,
            keywordWeight: weights.keywordWeight / weightSum,
            symbolWeight: weights.symbolWeight / weightSum,
            pathWeight: weights.pathWeight / weightSum,
            recencyWeight: weights.recencyWeight / weightSum,
          }
        : DEFAULT_SCORING_WEIGHTS;

    const queryTokens = tokenizeCode(query);
    const queryVector = await embeddingService.embedQuery(query.trim());

    // 1. Parallel Candidate Retrieval: Dense Vector + Sparse BM25
    const candidatePoolSize = Math.max(limit * 3, 20);

    const [vectorResults, bm25Hits] = await Promise.all([
      vectorService.searchVectors(repoId, queryVector, candidatePoolSize, 0.1),
      bm25Index.search(repoId, query, candidatePoolSize),
    ]);

    // 2. Candidate Union & Deduplication
    const candidateMap = new Map<
      string,
      {
        retrieved: RetrievedChunk;
        vectorScore: number;
        bm25Score: number;
      }
    >();

    // Add vector hits
    for (const vHit of vectorResults) {
      candidateMap.set(vHit.chunkId, {
        retrieved: vHit,
        vectorScore: Math.max(0, Math.min(1.0, vHit.score)),
        bm25Score: 0,
      });
    }

    // Add BM25 hits
    for (const bHit of bm25Hits) {
      const existing = candidateMap.get(bHit.chunk.id);
      if (existing) {
        existing.bm25Score = bHit.score;
      } else {
        const filePath = bHit.chunk.header?.path || "unknown";
        const language = bHit.chunk.header?.language || "plaintext";
        const contextualHeader = bHit.chunk.header
          ? formatContextualHeader(bHit.chunk.header)
          : "";

        candidateMap.set(bHit.chunk.id, {
          retrieved: {
            chunkId: bHit.chunk.id,
            repositoryId: bHit.chunk.repositoryId,
            fileId: bHit.chunk.fileId,
            filePath,
            symbolName: bHit.chunk.symbolName,
            chunkType: bHit.chunk.chunkType,
            startLine: bHit.chunk.startLine,
            endLine: bHit.chunk.endLine,
            content: bHit.chunk.content,
            contextualHeader,
            language,
            score: bHit.score,
          },
          vectorScore: 0,
          bm25Score: bHit.score,
        });
      }
    }

    // 3. Multi-Factor Scoring
    const scoredCandidates: ScoredChunk[] = [];

    for (const cand of candidateMap.values()) {
      const chunk = cand.retrieved;
      const symbolScore = this.computeSymbolMatchScore(queryTokens, chunk.symbolName);
      const pathScore = this.computePathMatchScore(queryTokens, chunk.filePath);
      const recencyScore = 0.9; // Baseline freshness factor

      const finalScore =
        normalizedWeights.vectorWeight * cand.vectorScore +
        normalizedWeights.keywordWeight * cand.bm25Score +
        normalizedWeights.symbolWeight * symbolScore +
        normalizedWeights.pathWeight * pathScore +
        normalizedWeights.recencyWeight * recencyScore;

      const breakdown: ChunkScoreBreakdown = {
        vectorScore: Number(cand.vectorScore.toFixed(4)),
        bm25Score: Number(cand.bm25Score.toFixed(4)),
        symbolMatchScore: Number(symbolScore.toFixed(4)),
        pathMatchScore: Number(pathScore.toFixed(4)),
        recencyScore: Number(recencyScore.toFixed(4)),
        finalScore: Number(finalScore.toFixed(4)),
      };

      scoredCandidates.push({
        ...chunk,
        score: Number(finalScore.toFixed(4)),
        scoreBreakdown: breakdown,
      });
    }

    // 4. Sort descending by finalScore
    scoredCandidates.sort((a, b) => b.score - a.score);

    // 5. Diversity-Aware Reranking (prevent single file from crowding out diverse context)
    const finalSelection: ScoredChunk[] = [];
    const fileCount = new Map<string, number>();
    const maxPerFile = limit >= 4 ? 2 : 3;

    // Pass 1: Add highest scoring chunks respecting per-file cap
    for (const c of scoredCandidates) {
      const count = fileCount.get(c.filePath) || 0;
      if (count < maxPerFile) {
        finalSelection.push(c);
        fileCount.set(c.filePath, count + 1);
        if (finalSelection.length >= limit) break;
      }
    }

    // Pass 2: If diversity filter left open slots, backfill with remaining best candidates
    if (finalSelection.length < limit) {
      for (const c of scoredCandidates) {
        if (!finalSelection.some((item) => item.chunkId === c.chunkId)) {
          finalSelection.push(c);
          if (finalSelection.length >= limit) break;
        }
      }
    }

    return {
      results: finalSelection,
      weightsUsed: normalizedWeights,
    };
  }
}

export const rerankerService = new RerankerService();
