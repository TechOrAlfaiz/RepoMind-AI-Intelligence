// apps/api/test-hybrid-evaluation.mjs
// Automated verification for Phase 10: Hybrid Retrieval, Multi-Factor Scoring, Reranking & Evaluation

import { tokenizeCode, bm25Index } from "./dist/modules/retrieval/bm25.service.js";
import { rerankerService } from "./dist/modules/retrieval/reranker.service.js";
import { evaluatorService, BENCHMARK_CASES } from "./dist/modules/retrieval/evaluator.service.js";
import { devChunks } from "./dist/modules/chunking/chunk.service.js";
import { devRepos } from "./dist/modules/repos/repo.service.js";
import { repoController } from "./dist/modules/repos/repo.controller.js";
import { vectorService, devVectorStore } from "./dist/modules/retrieval/vector.service.js";
import { embeddingService } from "./dist/modules/retrieval/embedding.service.js";

console.log("=========================================================");
console.log("    REPOMIND PHASE 10: HYBRID RETRIEVAL & EVAL TEST      ");
console.log("=========================================================");

let testsPassed = 0;
let testsTotal = 0;

function assert(condition, message) {
  testsTotal++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// 1. Test Code Tokenization
console.log("\n[1] Testing Code-Aware Tokenization...");
const tokens = tokenizeCode("function encryptVaultToken(plainText: string, secret_key: Buffer): string");
console.log("  - Tokens extracted:", tokens);

assert(tokens.includes("encrypt"), "Extracted 'encrypt' from camelCase");
assert(tokens.includes("vault"), "Extracted 'vault' from camelCase");
assert(tokens.includes("token"), "Extracted 'token' from camelCase");
assert(tokens.includes("secret"), "Extracted 'secret' from snake_case");
assert(tokens.includes("key"), "Extracted 'key' from snake_case");
assert(!tokens.includes("function"), "Stop word 'function' was properly filtered");
assert(!tokens.includes("string"), "Common type 'string' was properly filtered");

// 2. Setting up Hybrid Search Repository Corpus...
console.log("\n[2] Setting up Hybrid Search Repository Corpus...");

const repoAlpha = "repo-hybrid-alpha";
const repoBeta = "repo-hybrid-beta";

devRepos.set(repoAlpha, {
  id: repoAlpha,
  organizationId: "org-alpha",
  name: "hybrid-alpha",
  fullName: "acme/hybrid-alpha",
  defaultBranch: "main",
  currentCommitSha: "sha-1111",
  status: "completed",
  indexProgress: 100,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

devRepos.set(repoBeta, {
  id: repoBeta,
  organizationId: "org-beta",
  name: "hybrid-beta",
  fullName: "acme/hybrid-beta",
  defaultBranch: "main",
  currentCommitSha: "sha-2222",
  status: "completed",
  indexProgress: 100,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// Seed chunks corresponding to benchmark test cases
const chunk1 = {
  id: "chunk_auth_vault_1",
  repositoryId: repoAlpha,
  fileId: "file_auth_vault",
  symbolName: "encryptVaultToken",
  startLine: 12,
  endLine: 35,
  content: `export function encryptVaultToken(plainText: string, secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret, iv);
  return Buffer.concat([cipher.update(plainText), cipher.final()]).toString("hex");
}`,
  contentHash: "hash_v1",
  chunkType: "function",
  embeddingVersion: 1,
  header: {
    repository: "hybrid-alpha",
    path: "src/auth/vault.ts",
    symbolName: "encryptVaultToken",
    language: "typescript",
  },
  createdAt: new Date().toISOString(),
};

const chunk2 = {
  id: "chunk_rbac_middleware_2",
  repositoryId: repoAlpha,
  fileId: "file_rbac",
  symbolName: "requireRepoAccess",
  startLine: 40,
  endLine: 72,
  content: `export function requireRepoAccess(requiredRole: Role) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const roleHierarchy = { owner: 40, admin: 30, member: 20, viewer: 10 };
    if (userRoleLevel < roleHierarchy[requiredRole]) {
      return res.status(403).json({ error: "Forbidden: insufficient permissions" });
    }
    next();
  };
}`,
  contentHash: "hash_v2",
  chunkType: "function",
  embeddingVersion: 1,
  header: {
    repository: "hybrid-alpha",
    path: "src/middleware/auth.ts",
    symbolName: "requireRepoAccess",
    language: "typescript",
  },
  createdAt: new Date().toISOString(),
};

const chunk3 = {
  id: "chunk_ingestion_worker_3",
  repositoryId: repoAlpha,
  fileId: "file_worker",
  symbolName: "processIngestionJob",
  startLine: 25,
  endLine: 65,
  content: `export async function processIngestionJob(job: Job<IngestionJobPayload>) {
  const { repositoryId, userId } = job.data;
  console.log("Background ingestion worker processing queue with retry backoff");
  await fetchRepoTree(repositoryId);
}`,
  contentHash: "hash_v3",
  chunkType: "function",
  embeddingVersion: 1,
  header: {
    repository: "hybrid-alpha",
    path: "src/ingestion/ingestion.worker.ts",
    symbolName: "processIngestionJob",
    language: "typescript",
  },
  createdAt: new Date().toISOString(),
};

const chunk4 = {
  id: "chunk_ast_chunker_4",
  repositoryId: repoAlpha,
  fileId: "file_chunker",
  symbolName: "splitOversizedSymbol",
  startLine: 90,
  endLine: 135,
  content: `export function splitOversizedSymbol(node: ParserNode, maxLines: number = 60) {
  console.log("AST chunker decomposing oversized symbol into logical sub-blocks with parent headers");
}`,
  contentHash: "hash_v4",
  chunkType: "function",
  embeddingVersion: 1,
  header: {
    repository: "hybrid-alpha",
    path: "src/chunking/ast-chunker.ts",
    symbolName: "splitOversizedSymbol",
    language: "typescript",
  },
  createdAt: new Date().toISOString(),
};

const chunk5 = {
  id: "chunk_citation_validator_5",
  repositoryId: repoAlpha,
  fileId: "file_citations",
  symbolName: "validateCitations",
  startLine: 15,
  endLine: 48,
  content: `export function validateCitations(llmResponse: string, candidates: ChunkRecord[]) {
  // Post-generation citation validation detecting and stripping hallucinated [CTX-n] references
}`,
  contentHash: "hash_v5",
  chunkType: "function",
  embeddingVersion: 1,
  header: {
    repository: "hybrid-alpha",
    path: "src/rag/citation-validator.ts",
    symbolName: "validateCitations",
    language: "typescript",
  },
  createdAt: new Date().toISOString(),
};

// Seed Beta repo chunk to test tenant isolation
const chunkBeta = {
  id: "chunk_beta_secret",
  repositoryId: repoBeta,
  fileId: "file_beta",
  symbolName: "betaPaymentSecrets",
  startLine: 1,
  endLine: 20,
  content: `export const betaStripeKey = "sk_live_TENANT_BETA_CONFIDENTIAL";`,
  contentHash: "hash_b1",
  chunkType: "block",
  embeddingVersion: 1,
  header: {
    repository: "hybrid-beta",
    path: "src/billing/stripe.ts",
    symbolName: "betaPaymentSecrets",
    language: "typescript",
  },
  createdAt: new Date().toISOString(),
};

// Populate in-memory stores
devChunks.set(chunk1.id, chunk1);
devChunks.set(chunk2.id, chunk2);
devChunks.set(chunk3.id, chunk3);
devChunks.set(chunk4.id, chunk4);
devChunks.set(chunk5.id, chunk5);
devChunks.set(chunkBeta.id, chunkBeta);

// Generate vectors for vector search integration
const allTestChunks = [chunk1, chunk2, chunk3, chunk4, chunk5, chunkBeta];
for (const c of allTestChunks) {
  const vec = await embeddingService.embedQuery(`${c.header.path} ${c.symbolName} ${c.content}`);
  devVectorStore.upsert([
    {
      id: c.id,
      vector: vec,
      payload: {
        chunkId: c.id,
        repositoryId: c.repositoryId,
        fileId: c.fileId,
        filePath: c.header.path,
        symbolName: c.symbolName,
        startLine: c.startLine,
        endLine: c.endLine,
        chunkType: c.chunkType,
        language: c.header.language,
        contentHash: c.contentHash,
        content: c.content,
        contextualHeader: `// ${c.header.path}`,
      },
    },
  ]);
}

// 3. Test BM25 Search
console.log("\n[3] Testing BM25 Keyword Search...");
const bm25Hits = await bm25Index.search(repoAlpha, "encryptVaultToken aes-256-gcm");
assert(bm25Hits.length > 0, "BM25 search returned matches for exact token query");
assert(bm25Hits[0].chunk.id === chunk1.id, "Top BM25 match is encryptVaultToken chunk");
assert(bm25Hits[0].score >= 0.8, `Normalized BM25 score is high (${bm25Hits[0].score})`);

// 4. Test Multi-Factor Scoring Boosts
console.log("\n[4] Testing Symbol & Path Match Scoring...");
const symScoreExact = rerankerService.computeSymbolMatchScore(["encryptvaulttoken"], "encryptVaultToken");
assert(symScoreExact === 1.0, `Exact symbol match returns 1.0 (got ${symScoreExact})`);

const symScorePartial = rerankerService.computeSymbolMatchScore(["vault"], "encryptVaultToken");
assert(symScorePartial > 0.3, `Partial symbol sub-token match gets boost (got ${symScorePartial})`);

const pathScore = rerankerService.computePathMatchScore(["middleware", "auth"], "src/middleware/auth.ts");
assert(pathScore === 1.0, `Path match returns 1.0 for directory match (got ${pathScore})`);

// 5. Test Fused Hybrid Retrieval & Score Breakdown
console.log("\n[5] Testing Fused Hybrid Retrieval...");
const hybridRes = await rerankerService.hybridRetrieve(
  repoAlpha,
  "Where is AES-256 GCM token encryption configured?",
  5,
);

assert(hybridRes.results.length > 0, "Hybrid retrieval returned results");
const topResult = hybridRes.results[0];
assert(topResult.chunkId === chunk1.id, `Top hybrid result is chunk1 (got ${topResult.chunkId})`);
assert(topResult.scoreBreakdown !== undefined, "Score breakdown is attached to ScoredChunk");
assert(topResult.scoreBreakdown.vectorScore > 0, "Vector score component is present");
assert(topResult.scoreBreakdown.bm25Score > 0, "BM25 score component is present");
assert(topResult.scoreBreakdown.finalScore > 0, "Final composite score calculated");
console.log("  - Score Breakdown:", topResult.scoreBreakdown);

// 6. Test Zero Cross-Tenant Leakage
console.log("\n[6] Testing Strict Repository Scoping & Zero Leakage...");
const leakQuery = await rerankerService.hybridRetrieve(repoAlpha, "betaPaymentSecrets stripe sk_live");
const leakedChunk = leakQuery.results.find((c) => c.repositoryId === repoBeta || c.chunkId === chunkBeta.id);
assert(!leakedChunk, "ZERO chunks from Repo Beta returned when querying Repo Alpha (Tenant isolation preserved)");

// 7. Test Diversity-Aware Reranker (Cap per file)
console.log("\n[7] Testing Diversity-Aware Context Packing...");
// Add 4 chunks from giant-file.ts and 4 chunks from other-helpers.ts
for (let i = 10; i <= 13; i++) {
  const sameFileChunk = {
    id: `chunk_same_file_${i}`,
    repositoryId: repoAlpha,
    fileId: "file_massive",
    symbolName: `helper_${i}`,
    startLine: i * 20,
    endLine: i * 20 + 15,
    content: `export function helper_${i}() { return ${i}; }`,
    contentHash: `hash_sf_${i}`,
    chunkType: "function",
    embeddingVersion: 1,
    header: {
      repository: "hybrid-alpha",
      path: "src/massive/giant-file.ts",
      symbolName: `helper_${i}`,
      language: "typescript",
    },
    createdAt: new Date().toISOString(),
  };
  devChunks.set(sameFileChunk.id, sameFileChunk);

  const otherFileChunk = {
    id: `chunk_other_file_${i}`,
    repositoryId: repoAlpha,
    fileId: "file_other",
    symbolName: `helper_util_${i}`,
    startLine: i * 20,
    endLine: i * 20 + 15,
    content: `export function helper_util_${i}() { return ${i * 2}; }`,
    contentHash: `hash_of_${i}`,
    chunkType: "function",
    embeddingVersion: 1,
    header: {
      repository: "hybrid-alpha",
      path: "src/utils/other-helpers.ts",
      symbolName: `helper_util_${i}`,
      language: "typescript",
    },
    createdAt: new Date().toISOString(),
  };
  devChunks.set(otherFileChunk.id, otherFileChunk);
}

const diversityTest = await rerankerService.hybridRetrieve(repoAlpha, "helper", 4);
const giantFileCount = diversityTest.results.filter((c) => c.filePath === "src/massive/giant-file.ts").length;
const otherFileCount = diversityTest.results.filter((c) => c.filePath === "src/utils/other-helpers.ts").length;
assert(giantFileCount <= 2, `Diversity filter capped chunks from giant-file.ts to at most 2 (got ${giantFileCount})`);
assert(otherFileCount <= 2, `Diversity filter capped chunks from other-helpers.ts to at most 2 (got ${otherFileCount})`);
assert(diversityTest.results.length === 4, `Retrieved exactly 4 diverse chunks across files (got ${diversityTest.results.length})`);

// 8. Test Evaluator Service Benchmark Harness
console.log("\n[8] Running Benchmark Evaluation Harness...");
const benchmarkResult = await evaluatorService.runBenchmark(repoAlpha);

assert(benchmarkResult.totalCases === BENCHMARK_CASES.length, `Benchmark evaluated ${BENCHMARK_CASES.length} cases`);
assert(benchmarkResult.denseMetrics.recallAt5 >= 0.5, `Dense Recall@5 >= 50% (got ${(benchmarkResult.denseMetrics.recallAt5 * 100).toFixed(0)}%)`);
assert(benchmarkResult.hybridMetrics.recallAt5 >= 0.6, `Hybrid Recall@5 >= 60% (got ${(benchmarkResult.hybridMetrics.recallAt5 * 100).toFixed(0)}%)`);
assert(benchmarkResult.hybridMetrics.mrr > 0.4, `Hybrid MRR is solid (got ${benchmarkResult.hybridMetrics.mrr.toFixed(3)})`);
assert(benchmarkResult.cases.length === BENCHMARK_CASES.length, "All case-by-case evaluation details generated");

console.log(`  - Dense Recall@1: ${(benchmarkResult.denseMetrics.recallAt1 * 100).toFixed(0)}% | MRR: ${benchmarkResult.denseMetrics.mrr.toFixed(3)}`);
console.log(`  - BM25 Recall@1:  ${(benchmarkResult.bm25Metrics.recallAt1 * 100).toFixed(0)}% | MRR: ${benchmarkResult.bm25Metrics.mrr.toFixed(3)}`);
console.log(`  - Hybrid Recall@1: ${(benchmarkResult.hybridMetrics.recallAt1 * 100).toFixed(0)}% | MRR: ${benchmarkResult.hybridMetrics.mrr.toFixed(3)}`);

// 9. Test Express Controller Handlers
console.log("\n[9] Testing RepoController Hybrid & Evaluation Endpoints...");

function createMockReqRes(params, body) {
  let statusCode = 200;
  let jsonBody = null;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      jsonBody = data;
      return this;
    },
  };
  const req = {
    params,
    body,
  };
  return {
    req,
    res,
    getStatus: () => statusCode,
    getBody: () => jsonBody,
  };
}

// 9a: POST /api/repos/:repoId/retrieve-hybrid
const hybridReqMock = createMockReqRes(
  { repoId: repoAlpha },
  { query: "Where is AES-256 GCM token encryption configured?", limit: 5 },
);
await repoController.retrieveHybrid(hybridReqMock.req, hybridReqMock.res);
assert(hybridReqMock.getStatus() === 200, "POST /retrieve-hybrid returns 200 OK");
assert(Array.isArray(hybridReqMock.getBody()?.results), "Response body includes results array");
assert(hybridReqMock.getBody()?.weightsUsed !== undefined, "Response body specifies weightsUsed");

// 9b: POST /api/repos/:repoId/evaluate
const evalReqMock = createMockReqRes({ repoId: repoAlpha }, {});
await repoController.runEvaluationBenchmark(evalReqMock.req, evalReqMock.res);
assert(evalReqMock.getStatus() === 200, "POST /evaluate returns 200 OK");
assert(evalReqMock.getBody()?.hybridMetrics !== undefined, "Response includes hybridMetrics");
assert(evalReqMock.getBody()?.cases?.length > 0, "Response includes case breakdown");

console.log(`\n=========================================================`);
console.log(`    PHASE 10 TEST SUMMARY: ${testsPassed} / ${testsTotal} PASSED`);
console.log(`=========================================================\n`);

if (testsPassed !== testsTotal) {
  process.exit(1);
}
