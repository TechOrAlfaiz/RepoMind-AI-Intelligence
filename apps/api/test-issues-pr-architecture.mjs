import assert from "node:assert";
import { issueService, devIssues } from "./dist/modules/issues/issue.service.js";
import { prAnalyzerService } from "./dist/modules/prs/pr-analyzer.service.js";
import { architectureGraphService } from "./dist/modules/architecture/graph.service.js";
import { devRepos } from "./dist/modules/repos/repo.service.js";
import { devFiles, computeContentHash } from "./dist/modules/ingestion/ingestion.worker.js";
import { devChunks } from "./dist/modules/chunking/chunk.service.js";
import { devVectorStore } from "./dist/modules/retrieval/vector.service.js";

async function runTests() {
  console.log("\n=======================================================");
  console.log("  RepoMind Phase 12 Issues, PR & Architecture Test Suite");
  console.log("=======================================================\n");

  const repoId = "repo-intel-test-01";

  // Setup seed repository
  devRepos.set(repoId, {
    id: repoId,
    organizationId: "org-1",
    name: "repomind-core",
    fullName: "repomind/repomind-core",
    githubRepoId: 554433,
    defaultBranch: "main",
    branch: "main",
    indexStatus: "ready",
    indexVersion: 1,
    currentCommitSha: "abcdef1234567890abcdef1234567890abcdef12",
    fileCount: 4,
    chunkCount: 4,
    totalLines: 300,
    lastIndexedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // -------------------------------------------------------------------
  // TEST 1: GitHub Issue Ingestion, Indexing & Search
  // -------------------------------------------------------------------
  console.log("[Test 1] Testing GitHub Issue Ingestion & Search...");
  const sampleIssues = [
    {
      number: 101,
      title: "AES token decryption crash when authorization header is empty",
      body: "Calling decryptVaultToken with null or empty string throws unhandled TypeError.",
      state: "closed",
      labels: ["bug", "security"],
      author: "security-auditor",
      comments: [
        {
          id: "c1",
          author: "lead-dev",
          body: "Fixed in PR #104 by introducing defensive guard clause before cipher decryption.",
          createdAt: new Date().toISOString(),
        },
      ],
      linkedPrs: [104],
    },
    {
      number: 102,
      title: "Add dark mode toggle to navigation header",
      body: "User interface improvement for theme preference persistence in localStorage.",
      state: "open",
      labels: ["feature", "ui"],
      author: "frontend-dev",
      comments: [],
      linkedPrs: [],
    },
  ];

  const ingested = await issueService.ingestIssues(repoId, sampleIssues);
  assert.strictEqual(ingested.length, 2, "Should ingest 2 issues");

  const closedIssues = await issueService.getIssues(repoId, { state: "closed" });
  assert.strictEqual(closedIssues.length, 1, "Should filter closed issues");
  assert.strictEqual(closedIssues[0].number, 101);

  const similarIssues = await issueService.searchSimilarIssues(
    repoId,
    "AES token decryption unhandled error",
    3,
  );
  assert.ok(similarIssues.length > 0, "Should match similar issues based on tokens");
  assert.strictEqual(similarIssues[0].issueNumber, 101);
  assert.ok(similarIssues[0].similarityScore > 0, "Similarity score must be > 0");
  assert.ok(similarIssues[0].resolutionNotes?.includes("PR #104"), "Should extract resolution notes from comments");

  console.log("  ✓ Issue Ingestion, state filtering, and semantic search verified.");

  // -------------------------------------------------------------------
  // TEST 2: Bug Investigator with Line-Level Evidence & Similar Issues
  // -------------------------------------------------------------------
  console.log("\n[Test 2] Testing Bug Investigator (Code Chunks + Historical Issues)...");

  // Seed code chunk for AES vault
  const vaultContent = `import crypto from 'node:crypto';\n\nexport function decryptVaultToken(ciphertext: string, secretKey: Buffer): string {\n  if (!ciphertext) throw new Error("Invalid ciphertext");\n  const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey, Buffer.alloc(12));\n  return decipher.update(ciphertext, 'hex', 'utf8');\n}\n`;
  const vaultFileId = "file-vault-1";
  devFiles.set(vaultFileId, {
    id: vaultFileId,
    repositoryId: repoId,
    path: "src/security/vault.ts",
    language: "typescript",
    contentHash: computeContentHash(vaultContent),
    latestSha: "abcdef1234567890abcdef1234567890abcdef12",
    size: vaultContent.length,
    content: vaultContent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const vaultChunkId = "chunk-vault-1";
  const vaultChunk = {
    id: vaultChunkId,
    repositoryId: repoId,
    fileId: vaultFileId,
    startLine: 3,
    endLine: 7,
    content: vaultContent,
    contentHash: computeContentHash(vaultContent),
    chunkType: "function",
    embeddingVersion: 1,
    symbolName: "decryptVaultToken",
    header: {
      repository: "repomind-core",
      path: "src/security/vault.ts",
      symbolName: "decryptVaultToken",
      language: "typescript",
    },
    createdAt: new Date().toISOString(),
  };
  devChunks.set(vaultChunkId, vaultChunk);

  devVectorStore.upsert([
    {
      id: vaultChunkId,
      vector: new Array(1536).fill(0.15),
      payload: {
        chunkId: vaultChunkId,
        repositoryId: repoId,
        filePath: "src/security/vault.ts",
        fileId: vaultFileId,
        symbolName: "decryptVaultToken",
        chunkType: "function",
        startLine: 3,
        endLine: 7,
        language: "typescript",
        contentHash: vaultChunk.contentHash,
        content: vaultContent,
        contextualHeader: "// Repo: repomind-core | Path: src/security/vault.ts",
      },
    },
  ]);

  const investigation = await issueService.investigateBug(
    repoId,
    "decryptVaultToken AES unhandled exception error",
  );

  assert.strictEqual(investigation.repositoryId, repoId);
  assert.ok(investigation.suspectedLocations.length > 0, "Must return suspected code locations");
  const topLoc = investigation.suspectedLocations[0];
  assert.strictEqual(topLoc.filePath, "src/security/vault.ts");
  assert.strictEqual(topLoc.symbolName, "decryptVaultToken");
  assert.strictEqual(topLoc.startLine, 3);
  assert.strictEqual(topLoc.endLine, 7);
  assert.ok(topLoc.snippet.includes("decryptVaultToken"), "Snippet must include relevant code");

  assert.ok(investigation.similarIssues.length > 0, "Must correlate similar historical issue #101");
  assert.strictEqual(investigation.similarIssues[0].issueNumber, 101);

  assert.ok(investigation.rootCauseHypothesis.length > 20, "Root cause hypothesis generated");
  assert.ok(investigation.diagnosticSteps.length >= 3, "Diagnostic steps generated");
  console.log("  ✓ Bug Investigator synthesized line-level citations and historical resolution patterns.");

  // -------------------------------------------------------------------
  // TEST 3: Pull Request Analyzer (Advisory Human Review Only)
  // -------------------------------------------------------------------
  console.log("\n[Test 3] Testing PR Analyzer & Strict Advisory Invariant...");

  // High-Risk Security PR
  const highRiskPr = {
    repositoryId: repoId,
    prNumber: 201,
    title: "fix: update aes vault encryption key handling",
    author: "external-contributor",
    changedFiles: [
      {
        filename: "src/security/vault.ts",
        status: "modified",
        additions: 35,
        deletions: 12,
        patch: "export function encryptVaultToken(secret: string) { ... }",
      },
    ],
  };

  const highRiskAnalysis = await prAnalyzerService.analyzePullRequest(highRiskPr);
  assert.strictEqual(highRiskAnalysis.riskLevel, "high", "Modifying vault.ts must yield high risk");
  assert.ok(highRiskAnalysis.riskScore >= 75, "High risk score must be >= 75");
  assert.ok(highRiskAnalysis.filesNeedingHumanReview.length > 0, "Must flag files for human review");
  assert.strictEqual(highRiskAnalysis.filesNeedingHumanReview[0].priority, "high");
  assert.ok(highRiskAnalysis.reviewChecklist.length > 0, "Must generate review checklist");
  assert.ok(highRiskAnalysis.suggestedTests.length > 0, "Must suggest tests");
  assert.ok(
    highRiskAnalysis.humanReviewOnlyNotice.includes("never auto-approves or auto-merges"),
    "STRICT INVARIANT: PR analyzer must explicitly state it never auto-approves or merges",
  );

  // Low-Risk Docs PR
  const lowRiskPr = {
    repositoryId: repoId,
    prNumber: 202,
    title: "docs: fix typo in README",
    author: "docs-helper",
    changedFiles: [
      {
        filename: "README.md",
        status: "modified",
        additions: 2,
        deletions: 1,
      },
    ],
  };

  const lowRiskAnalysis = await prAnalyzerService.analyzePullRequest(lowRiskPr);
  assert.strictEqual(lowRiskAnalysis.riskLevel, "low", "Docs PR must evaluate to low risk");
  assert.ok(lowRiskAnalysis.riskScore <= 30, "Low risk score must be <= 30");

  console.log("  ✓ PR Analyzer accurately classified risk levels and enforced advisory-only invariant.");

  // -------------------------------------------------------------------
  // TEST 4: Deterministic Static Architecture Dependency Graph
  // -------------------------------------------------------------------
  console.log("\n[Test 4] Testing Deterministic Static Architecture Graph (Zero Hallucination)...");

  // Seed 4 interconnected files
  // 1. Router
  const routerCode = `import { Router } from 'express';\nimport { authService } from './auth.service.js';\nexport const authRouter = Router();\n`;
  devFiles.set("file-router", {
    id: "file-router",
    repositoryId: repoId,
    path: "src/modules/auth/auth.router.ts",
    language: "typescript",
    contentHash: computeContentHash(routerCode),
    latestSha: "abcdef1234567890abcdef1234567890abcdef12",
    size: routerCode.length,
    content: routerCode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 2. Service
  const serviceCode = `import { UserModel } from './models/user.model.js';\nimport { hashPassword } from '../../utils/crypto.js';\nexport class AuthService {}\n`;
  devFiles.set("file-service", {
    id: "file-service",
    repositoryId: repoId,
    path: "src/modules/auth/auth.service.ts",
    language: "typescript",
    contentHash: computeContentHash(serviceCode),
    latestSha: "abcdef1234567890abcdef1234567890abcdef12",
    size: serviceCode.length,
    content: serviceCode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 3. Model
  const modelCode = `export interface User { id: string; email: string; }\nexport const UserModel = {};\n`;
  devFiles.set("file-model", {
    id: "file-model",
    repositoryId: repoId,
    path: "src/modules/auth/models/user.model.ts",
    language: "typescript",
    contentHash: computeContentHash(modelCode),
    latestSha: "abcdef1234567890abcdef1234567890abcdef12",
    size: modelCode.length,
    content: modelCode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 4. Util
  const utilCode = `export function hashPassword(p: string): string { return p; }\n`;
  devFiles.set("file-util", {
    id: "file-util",
    repositoryId: repoId,
    path: "src/utils/crypto.ts",
    language: "typescript",
    contentHash: computeContentHash(utilCode),
    latestSha: "abcdef1234567890abcdef1234567890abcdef12",
    size: utilCode.length,
    content: utilCode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const graph = await architectureGraphService.buildArchitectureGraph(repoId);

  assert.strictEqual(graph.repositoryId, repoId);
  assert.ok(graph.nodes.length >= 4, "Graph must contain all seed nodes");

  // Validate Node Classification
  const routerNode = graph.nodes.find((n) => n.path.includes("auth.router"));
  assert.ok(routerNode);
  assert.strictEqual(routerNode.type, "router");

  const serviceNode = graph.nodes.find((n) => n.path.includes("auth.service"));
  assert.ok(serviceNode);
  assert.strictEqual(serviceNode.type, "service");

  const modelNode = graph.nodes.find((n) => n.path.includes("user.model"));
  assert.ok(modelNode);
  assert.strictEqual(modelNode.type, "model");

  const utilNode = graph.nodes.find((n) => n.path.includes("crypto.ts"));
  assert.ok(utilNode);
  assert.strictEqual(utilNode.type, "util");

  // Validate Directed Edges
  assert.ok(graph.edges.length >= 2, "Graph must contain static import edges");
  const routerToServiceEdge = graph.edges.find(
    (e) => e.source === routerNode.id && e.target === serviceNode.id,
  );
  assert.ok(routerToServiceEdge, "Must extract edge from auth.router to auth.service");

  const serviceToModelEdge = graph.edges.find(
    (e) => e.source === serviceNode.id && e.target === modelNode.id,
  );
  assert.ok(serviceToModelEdge, "Must extract edge from auth.service to user.model");

  // Validate Zero Hallucinated Targets
  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  for (const edge of graph.edges) {
    assert.ok(nodeIds.has(edge.source), `Edge source ${edge.source} must exist in nodes`);
    assert.ok(nodeIds.has(edge.target), `Edge target ${edge.target} must exist in nodes`);
  }

  // Validate Mermaid Diagram
  assert.ok(graph.mermaidSyntax.startsWith("graph TD"), "Mermaid definition must start with 'graph TD'");
  assert.ok(graph.mermaidSyntax.includes(routerNode.id), "Mermaid must declare router node");
  assert.ok(graph.mermaidSyntax.includes(serviceNode.id), "Mermaid must declare service node");

  // Validate Metrics
  assert.ok(graph.metrics.totalNodes >= 4);
  assert.ok(graph.metrics.totalEdges >= 2);
  assert.ok(graph.metrics.entryPoints.includes("auth.router") || graph.metrics.entryPoints.length > 0);

  console.log(`  ✓ Deterministic Architecture Graph built: ${graph.nodes.length} nodes, ${graph.edges.length} edges, valid Mermaid syntax.`);

  console.log("\n=======================================================");
  console.log("  🎉 ALL PHASE 12 INTELLIGENCE TESTS PASSED (4/4)!");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
