import { chunkService } from "../chunking/chunk.service.js";
import { formatContextualHeader } from "../chunking/parsers/ast-chunker.js";
import type { ChunkRecord } from "@repomind/shared-types";

// Common programming language noise words to ignore in BM25 index
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
  "by", "from", "up", "about", "into", "over", "after", "is", "are", "was", "were",
  "be", "been", "being", "have", "has", "had", "do", "does", "did", "this", "that",
  "these", "those", "it", "its", "as", "if", "const", "let", "var", "return", "function",
  "import", "export", "class", "interface", "type", "from", "public", "private", "protected",
  "async", "await", "default", "null", "undefined", "true", "false", "string", "number", "boolean",
  "any", "void", "promise", "record",
]);

/**
 * Tokenizes source code and natural language queries, splitting camelCase, snake_case,
 * and punctuation into constituent semantic tokens.
 */
export function tokenizeCode(text: string): string[] {
  if (!text) return [];

  // 1. Separate punctuation, braces, quotes, operators with spaces
  const sanitized = text
    .replace(/[^\w\s$]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = sanitized.split(" ");
  const tokens: string[] = [];

  for (const word of words) {
    if (!word || word.length < 2) continue;

    const lower = word.toLowerCase();
    if (!STOP_WORDS.has(lower)) {
      tokens.push(lower);
    }

    // Split camelCase/PascalCase: e.g. encryptVaultToken -> [encrypt, vault, token]
    const subParts = word
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z0-9])/g, "$1 $2")
      .replace(/[_-]/g, " ")
      .toLowerCase()
      .split(" ")
      .filter((p) => p.length >= 2 && !STOP_WORDS.has(p));

    if (subParts.length > 1) {
      for (const part of subParts) {
        tokens.push(part);
      }
    }
  }

  return tokens;
}

export interface BM25Hit {
  chunk: ChunkRecord;
  score: number;
  rawScore: number;
}

export class BM25Index {
  private k1: number = 1.2;
  private b: number = 0.75;

  /**
   * Searches repository chunks using Okapi BM25 scoring algorithm.
   * Strictly isolated by repositoryId.
   */
  async search(repoId: string, query: string, limit: number = 20): Promise<BM25Hit[]> {
    const queryTokens = tokenizeCode(query);
    if (queryTokens.length === 0) return [];

    // Fetch all indexed chunks for this specific repository
    const chunks = await chunkService.getRepoChunks(repoId);
    if (chunks.length === 0) return [];

    const N = chunks.length;

    // Tokenize each chunk and calculate lengths
    const docTokensMap = new Map<string, string[]>();
    const docTermFreqs = new Map<string, Map<string, number>>();
    let totalTokens = 0;

    for (const chunk of chunks) {
      // Include content, symbol name, and file path in chunk document representation
      const pathStr = chunk.header?.path || "";
      const headerStr = chunk.header ? formatContextualHeader(chunk.header) : "";
      const docText = `${pathStr} ${chunk.symbolName || ""} ${headerStr} ${chunk.content}`;
      const tokens = tokenizeCode(docText);
      docTokensMap.set(chunk.id, tokens);
      totalTokens += tokens.length;

      const tfMap = new Map<string, number>();
      for (const t of tokens) {
        tfMap.set(t, (tfMap.get(t) || 0) + 1);
      }
      docTermFreqs.set(chunk.id, tfMap);
    }

    const avgdl = totalTokens / N;

    // Calculate Document Frequency (n_qi) for each unique query token
    const uniqueQueryTokens = Array.from(new Set(queryTokens));
    const idfMap = new Map<string, number>();

    for (const qToken of uniqueQueryTokens) {
      let docFreq = 0;
      for (const tfMap of docTermFreqs.values()) {
        if (tfMap.has(qToken)) {
          docFreq++;
        }
      }

      // Okapi BM25 standard IDF with smoothing
      const idf = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);
      idfMap.set(qToken, Math.max(0, idf));
    }

    // Score all documents
    const scoredChunks: Array<{ chunk: ChunkRecord; rawScore: number }> = [];

    for (const chunk of chunks) {
      const tokens = docTokensMap.get(chunk.id) || [];
      const tfMap = docTermFreqs.get(chunk.id) || new Map<string, number>();
      const docLen = tokens.length;

      let score = 0;

      for (const qToken of uniqueQueryTokens) {
        const idf = idfMap.get(qToken) || 0;
        const tf = tfMap.get(qToken) || 0;

        if (tf > 0 && idf > 0) {
          const numerator = tf * (this.k1 + 1);
          const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / (avgdl || 1)));
          score += idf * (numerator / denominator);
        }
      }

      if (score > 0) {
        scoredChunks.push({ chunk, rawScore: score });
      }
    }

    // Sort descending by raw BM25 score
    scoredChunks.sort((a, b) => b.rawScore - a.rawScore);

    const topHits = scoredChunks.slice(0, limit);
    if (topHits.length === 0) return [];

    // Min-Max normalize scores to [0.1, 1.0] for combination with cosine vector scores
    const maxScore = topHits[0].rawScore;
    const minScore = topHits[topHits.length - 1].rawScore;
    const scoreRange = maxScore - minScore;

    return topHits.map((h) => {
      const normalized =
        scoreRange > 0.0001
          ? 0.2 + 0.8 * ((h.rawScore - minScore) / scoreRange)
          : 0.9;
      return {
        chunk: h.chunk,
        score: Math.min(1.0, Math.max(0.0, normalized)),
        rawScore: h.rawScore,
      };
    });
  }
}

export const bm25Index = new BM25Index();
