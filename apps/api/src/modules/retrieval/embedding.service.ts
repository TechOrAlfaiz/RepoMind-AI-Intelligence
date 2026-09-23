import crypto from "node:crypto";
import { config } from "../../config/env.js";
import { formatContextualHeader } from "../chunking/parsers/ast-chunker.js";
import type { ChunkRecord } from "@repomind/shared-types";

export interface IEmbeddingProvider {
  name: string;
  getDimensions(): number;
  embedBatch(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

/**
 * Normalizes a vector to unit length (L2 norm = 1.0).
 */
export function l2Normalize(vector: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vector.length; i++) {
    sumSq += vector[i] * vector[i];
  }
  const mag = Math.sqrt(sumSq);
  if (mag === 0) return vector;
  return vector.map((v) => v / mag);
}

/**
 * Deterministic Dev Embedding Provider (1536 dimensions)
 * Designed for reliable, zero-network, reproducible local development and tests.
 * Uses sub-word tokenization and hashed semantic projection with L2 unit normalization.
 */
export class DeterministicDevEmbeddingProvider implements IEmbeddingProvider {
  name = "deterministic-dev";
  private dimensions = 1536;

  getDimensions(): number {
    return this.dimensions;
  }

  private generateVector(text: string): number[] {
    const vector = new Array<number>(this.dimensions).fill(0);

    // 1. Split camelCase (e.g. verifySession -> verify Session, AES256 -> AES 256)
    const splitCamel = text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
    const words = splitCamel.match(/[a-z0-9_]{2,}/g) || [];

    // 2. Unigrams and Bigrams
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      // Full word token (high weight)
      this.hashIntoVector(w, vector, 3.0);

      // Bigram with next word
      if (i < words.length - 1) {
        this.hashIntoVector(`${w}_${words[i + 1]}`, vector, 4.0);
      }

      // Subword character 3-grams and 4-grams for stemming/root matching (e.g. auth / authenticate)
      if (w.length >= 3) {
        for (let j = 0; j <= Math.min(w.length - 3, 6); j++) {
          this.hashIntoVector(w.substring(j, j + 3), vector, 1.0);
        }
      }
      if (w.length >= 4) {
        for (let j = 0; j <= Math.min(w.length - 4, 6); j++) {
          this.hashIntoVector(w.substring(j, j + 4), vector, 1.2);
        }
      }
    }

    if (words.length === 0) {
      this.hashIntoVector(text.toLowerCase() || "empty", vector, 1.0);
    }

    return l2Normalize(vector);
  }

  private hashIntoVector(term: string, vector: number[], weight: number) {
    const hash = crypto.createHash("sha256").update(term).digest();
    // Primary dense projection
    const index = hash.readUInt32BE(0) % this.dimensions;
    const sign = (hash.readUInt8(4) % 2 === 0) ? 1 : -1;
    vector[index] += sign * weight;

    // Secondary projection for lower collision probability
    const index2 = hash.readUInt32BE(8) % this.dimensions;
    const sign2 = (hash.readUInt8(12) % 2 === 0) ? 1 : -1;
    vector[index2] += sign2 * (weight * 0.7);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.generateVector(t));
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.generateVector(text);
  }
}

/**
 * OpenAI Embeddings Provider
 * Uses text-embedding-3-small (1536 dimensions) via REST API.
 */
export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  name = "openai";
  private apiKey: string;
  private dimensions = 1536;
  private model = "text-embedding-3-small";
  private fallback = new DeterministicDevEmbeddingProvider();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    try {
      const BATCH_SIZE = 100;
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const slice = texts.slice(i, i + BATCH_SIZE);
        const res = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            input: slice,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`OpenAI Embeddings API error (${res.status}): ${errText}`);
        }

        const data = (await res.json()) as any;
        const vectors: number[][] = data.data.map((d: any) => d.embedding);
        allEmbeddings.push(...vectors);
      }

      return allEmbeddings;
    } catch (err: any) {
      console.warn(`[RepoMind Embeddings] OpenAI call failed (${err.message}). Using deterministic fallback.`);
      return this.fallback.embedBatch(texts);
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      const res = await this.embedBatch([text]);
      return res[0];
    } catch (err) {
      return this.fallback.embedQuery(text);
    }
  }
}

/**
 * Unified Embedding Service
 */
export class EmbeddingService {
  private provider: IEmbeddingProvider;

  constructor() {
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey && openAiKey.startsWith("sk-")) {
      console.log("[RepoMind Embeddings] Initializing OpenAI embedding provider (text-embedding-3-small)...");
      this.provider = new OpenAIEmbeddingProvider(openAiKey);
    } else {
      console.log("[RepoMind Embeddings] Initializing Deterministic Dev embedding provider (1536 dims, offline)...");
      this.provider = new DeterministicDevEmbeddingProvider();
    }
  }

  getDimensions(): number {
    return this.provider.getDimensions();
  }

  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Prepares the full chunk context (header + source) and embeds a batch of chunks.
   */
  async embedChunks(chunks: ChunkRecord[]): Promise<number[][]> {
    const formattedTexts = chunks.map((chunk) => {
      const headerStr = formatContextualHeader(chunk.header);
      return `${headerStr}\n${chunk.content}`;
    });

    return this.provider.embedBatch(formattedTexts);
  }

  /**
   * Embeds a search query string.
   */
  async embedQuery(query: string): Promise<number[]> {
    return this.provider.embedQuery(query);
  }
}

export const embeddingService = new EmbeddingService();
