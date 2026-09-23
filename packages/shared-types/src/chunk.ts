export type ChunkType = "function" | "class" | "interface" | "method" | "type" | "block";

export interface ContextualHeader {
  repository: string;
  path: string;
  symbolName?: string;
  language: string;
  scope?: string;
}

export interface ChunkRecord {
  id: string;
  repositoryId: string;
  fileId: string;
  symbolName?: string;
  startLine: number;
  endLine: number;
  content: string;
  contentHash: string;
  chunkType: ChunkType;
  embeddingVersion: number;
  header: ContextualHeader;
  createdAt: string;
}

export interface VectorPayload {
  chunkId: string;
  repositoryId: string;
  fileId: string;
  filePath: string;
  symbolName: string;
  startLine: number;
  endLine: number;
  chunkType: ChunkType;
  language: string;
  contentHash: string;
  content: string;
  contextualHeader: string;
}

export interface RetrievedChunk {
  chunkId: string;
  repositoryId: string;
  fileId: string;
  filePath: string;
  symbolName?: string;
  chunkType: ChunkType;
  startLine: number;
  endLine: number;
  content: string;
  contextualHeader: string;
  language: string;
  score: number;
}

export interface VectorSearchQuery {
  repositoryId: string;
  query: string;
  limit?: number;
  scoreThreshold?: number;
}

export interface VectorSearchResponse {
  results: RetrievedChunk[];
  totalMatches: number;
  queryLatencyMs: number;
}

export interface ScoringWeights {
  vectorWeight: number;    // alpha (default 0.45)
  keywordWeight: number;   // beta (default 0.25)
  symbolWeight: number;    // gamma (default 0.15)
  pathWeight: number;      // delta (default 0.10)
  recencyWeight: number;   // epsilon (default 0.05)
}

export interface ChunkScoreBreakdown {
  vectorScore: number;
  bm25Score: number;
  symbolMatchScore: number;
  pathMatchScore: number;
  recencyScore: number;
  finalScore: number;
}

export interface ScoredChunk extends RetrievedChunk {
  scoreBreakdown: ChunkScoreBreakdown;
}

export interface HybridRetrievalResponse {
  results: ScoredChunk[];
  totalCandidates: number;
  weightsUsed: ScoringWeights;
  latencyMs: number;
}

export interface EvaluationCase {
  id: string;
  question: string;
  expectedFilePath: string;
  expectedSymbolName?: string;
  expectedLineRange?: [number, number];
}

export interface BenchmarkMetrics {
  recallAt1: number;
  recallAt3: number;
  recallAt5: number;
  mrr: number;
  latencyMs: number;
}

export interface EvaluationBenchmarkResult {
  timestamp: string;
  totalCases: number;
  weightsUsed: ScoringWeights;
  denseMetrics: BenchmarkMetrics;
  bm25Metrics: BenchmarkMetrics;
  hybridMetrics: BenchmarkMetrics;
  cases: Array<{
    caseId: string;
    question: string;
    expectedEvidence: string;
    retrievedTop1: string;
    rankInHybrid: number;
    matched: boolean;
    finalScore: number;
  }>;
}

