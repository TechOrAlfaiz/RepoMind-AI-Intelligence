import type {
  EvaluationCase,
  EvaluationBenchmarkResult,
  BenchmarkMetrics,
  ScoringWeights,
  ScoredChunk,
} from "@repomind/shared-types";
import { rerankerService } from "./reranker.service.js";

export const BENCHMARK_CASES: EvaluationCase[] = [
  {
    id: "eval-auth-encryption",
    question: "Where is AES-256 GCM token encryption configured?",
    expectedFilePath: "src/auth/vault.ts",
    expectedSymbolName: "encryptVaultToken",
  },
  {
    id: "eval-rbac-middleware",
    question: "How are organization role hierarchies verified on endpoints?",
    expectedFilePath: "src/middleware/auth.ts",
    expectedSymbolName: "requireRepoAccess",
  },
  {
    id: "eval-ingestion-worker",
    question: "Explain the background ingestion worker queue and retry logic.",
    expectedFilePath: "src/ingestion/ingestion.worker.ts",
    expectedSymbolName: "processIngestionJob",
  },
  {
    id: "eval-ast-chunking",
    question: "How does code chunking decompose oversized symbols into sub-chunks?",
    expectedFilePath: "src/chunking/ast-chunker.ts",
    expectedSymbolName: "splitOversizedSymbol",
  },
  {
    id: "eval-citation-validation",
    question: "How are hallucinated LLM citations detected and stripped?",
    expectedFilePath: "src/rag/citation-validator.ts",
    expectedSymbolName: "validateCitations",
  },
];

export class EvaluatorService {
  /**
   * Helper to check if a retrieved chunk matches the expected test case evidence.
   */
  matchesExpected(chunk: ScoredChunk, expected: EvaluationCase): boolean {
    const pathMatch =
      chunk.filePath.includes(expected.expectedFilePath) ||
      expected.expectedFilePath.includes(chunk.filePath);

    if (!pathMatch) return false;

    if (expected.expectedSymbolName && chunk.symbolName) {
      return (
        chunk.symbolName.includes(expected.expectedSymbolName) ||
        expected.expectedSymbolName.includes(chunk.symbolName)
      );
    }

    return true;
  }

  /**
   * Computes Recall@K and MRR for a given retrieval run across evaluation cases.
   */
  computeMetrics(
    cases: EvaluationCase[],
    retrievedResultsByCase: Map<string, ScoredChunk[]>,
    totalLatencyMs: number,
  ): BenchmarkMetrics {
    let r1 = 0;
    let r3 = 0;
    let r5 = 0;
    let mrrSum = 0;

    for (const testCase of cases) {
      const hits = retrievedResultsByCase.get(testCase.id) || [];
      let foundRank = -1;

      for (let i = 0; i < hits.length; i++) {
        if (this.matchesExpected(hits[i], testCase)) {
          foundRank = i + 1;
          break;
        }
      }

      if (foundRank === 1) r1++;
      if (foundRank >= 1 && foundRank <= 3) r3++;
      if (foundRank >= 1 && foundRank <= 5) r5++;
      if (foundRank >= 1) {
        mrrSum += 1.0 / foundRank;
      }
    }

    const n = Math.max(cases.length, 1);
    return {
      recallAt1: Number((r1 / n).toFixed(4)),
      recallAt3: Number((r3 / n).toFixed(4)),
      recallAt5: Number((r5 / n).toFixed(4)),
      mrr: Number((mrrSum / n).toFixed(4)),
      latencyMs: Math.round(totalLatencyMs / n),
    };
  }

  /**
   * Runs the full evaluation benchmark comparing Dense-Only, BM25-Only, and Fused Hybrid.
   */
  async runBenchmark(
    repoId: string,
    customWeights?: Partial<ScoringWeights>,
  ): Promise<EvaluationBenchmarkResult> {
    const casesToUse = BENCHMARK_CASES;

    // 1. Evaluate Dense Vector Only (alpha=1.0)
    const denseStart = Date.now();
    const denseMap = new Map<string, ScoredChunk[]>();
    for (const c of casesToUse) {
      const res = await rerankerService.hybridRetrieve(repoId, c.question, 8, {
        vectorWeight: 1.0,
        keywordWeight: 0.0,
        symbolWeight: 0.0,
        pathWeight: 0.0,
        recencyWeight: 0.0,
      });
      denseMap.set(c.id, res.results);
    }
    const denseMetrics = this.computeMetrics(
      casesToUse,
      denseMap,
      Date.now() - denseStart,
    );

    // 2. Evaluate Sparse BM25 Keyword Only (beta=1.0)
    const bm25Start = Date.now();
    const bm25Map = new Map<string, ScoredChunk[]>();
    for (const c of casesToUse) {
      const res = await rerankerService.hybridRetrieve(repoId, c.question, 8, {
        vectorWeight: 0.0,
        keywordWeight: 1.0,
        symbolWeight: 0.0,
        pathWeight: 0.0,
        recencyWeight: 0.0,
      });
      bm25Map.set(c.id, res.results);
    }
    const bm25Metrics = this.computeMetrics(
      casesToUse,
      bm25Map,
      Date.now() - bm25Start,
    );

    // 3. Evaluate Fused Hybrid Reranked
    const hybridStart = Date.now();
    const hybridMap = new Map<string, ScoredChunk[]>();
    let finalWeightsUsed: ScoringWeights = {
      vectorWeight: 0.45,
      keywordWeight: 0.25,
      symbolWeight: 0.15,
      pathWeight: 0.10,
      recencyWeight: 0.05,
    };

    for (const c of casesToUse) {
      const res = await rerankerService.hybridRetrieve(
        repoId,
        c.question,
        8,
        customWeights,
      );
      hybridMap.set(c.id, res.results);
      finalWeightsUsed = res.weightsUsed;
    }
    const hybridMetrics = this.computeMetrics(
      casesToUse,
      hybridMap,
      Date.now() - hybridStart,
    );

    // 4. Construct Case-by-Case Breakdown
    const caseDetails = casesToUse.map((c) => {
      const hits = hybridMap.get(c.id) || [];
      let rank = -1;
      for (let i = 0; i < hits.length; i++) {
        if (this.matchesExpected(hits[i], c)) {
          rank = i + 1;
          break;
        }
      }

      const top1 = hits[0];
      return {
        caseId: c.id,
        question: c.question,
        expectedEvidence: `${c.expectedFilePath}${c.expectedSymbolName ? ` (${c.expectedSymbolName})` : ""}`,
        retrievedTop1: top1 ? `${top1.filePath}:${top1.startLine}-${top1.endLine} (${top1.symbolName || "block"})` : "None",
        rankInHybrid: rank,
        matched: rank > 0,
        finalScore: top1 ? top1.score : 0,
      };
    });

    return {
      timestamp: new Date().toISOString(),
      totalCases: casesToUse.length,
      weightsUsed: finalWeightsUsed,
      denseMetrics,
      bm25Metrics,
      hybridMetrics,
      cases: caseDetails,
    };
  }
}

export const evaluatorService = new EvaluatorService();
