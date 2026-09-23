import assert from "node:assert";
import { encryptToken, decryptToken } from "../../dist/utils/crypto.js";
import { repoService, devRepos } from "../../dist/modules/repos/repo.service.js";
import { getRepoFiles, processIngestionJob } from "../../dist/modules/ingestion/ingestion.worker.js";
import { chunkService } from "../../dist/modules/chunking/chunk.service.js";
import { devVectorStore } from "../../dist/modules/retrieval/vector.service.js";
import { retrievalService } from "../../dist/modules/retrieval/retrieval.service.js";
import { orgService } from "../../dist/modules/orgs/org.service.js";

async function runIntegrationTests() {
  console.log("\n=======================================================");
  console.log("  RepoMind Phase 14: Automated Integration Test Suite");
  console.log("=======================================================\n");

  const orgId = "org-integration-01";
  const userId = "user-integration-01";

  // Setup seed organization
  orgService.setDevOrg({
    id: orgId,
    name: "Integration Test Org",
    slug: "integration-test-org",
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  orgService.setDevMembership(userId, orgId, "owner");

  // -------------------------------------------------------------------
  // 1. OAuth Token Vault & State Integration
  // -------------------------------------------------------------------
  console.log("[Integration 1] Testing OAuth Token Vault (AES-256-GCM Encryption/Decryption)...");

  const sampleGitHubAccessToken = "gho_A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0";
  const encryptedPayload = encryptToken(sampleGitHubAccessToken);

  assert.ok(encryptedPayload.encryptedData, "Encrypted data must be generated");
  assert.ok(encryptedPayload.iv, "Initialization vector must be present");
  assert.ok(encryptedPayload.authTag, "Authentication tag must be present");
  assert.notStrictEqual(encryptedPayload.encryptedData, sampleGitHubAccessToken, "Ciphertext must not match plaintext");

  const decryptedToken = decryptToken(encryptedPayload);
  assert.strictEqual(decryptedToken, sampleGitHubAccessToken, "Decrypted token must exactly match original plaintext");

  // Verify tampering detection (GCM authentication tag violation)
  const tamperedPayload = {
    ...encryptedPayload,
    encryptedData: encryptedPayload.encryptedData.substring(0, encryptedPayload.encryptedData.length - 2) + "00",
  };
  assert.throws(
    () => decryptToken(tamperedPayload),
    /Unsupported state or unable to authenticate data|bad decrypt/i,
    "Tampered ciphertext must fail authentication tag check and throw"
  );

  console.log(`  ✓ OAuth Token Vault passed: AES-256-GCM encryption, decryption, and tampering detection verified`);

  // -------------------------------------------------------------------
  // 2. Repository Ingestion Job Lifecycle & File Persistence
  // -------------------------------------------------------------------
  console.log("\n[Integration 2] Testing Ingestion Job Lifecycle (Connect -> Process -> Index)...");

  const repo = await repoService.connectRepo(orgId, {
    name: "repomind-analytics",
    fullName: "repomind/repomind-analytics",
    githubRepoId: 987654,
    defaultBranch: "main",
    branch: "main",
    isPrivate: true,
  });

  assert.strictEqual(repo.indexStatus, "pending", "Newly connected repo must start in pending status");

  // Simulate file tree ingestion directly through worker pipeline
  const mockFileTree = [
    {
      path: "src/analytics/tracker.ts",
      content: `
export interface EventPayload {
  eventName: string;
  timestamp: number;
}

export class AnalyticsTracker {
  private events: EventPayload[] = [];

  public track(name: string): void {
    this.events.push({ eventName: name, timestamp: Date.now() });
  }

  public flush(): EventPayload[] {
    const batch = [...this.events];
    this.events = [];
    return batch;
  }
}
      `.trim(),
    },
    {
      path: "src/analytics/metrics.ts",
      content: `
export function computeEventFrequency(events: Array<{ eventName: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const e of events) {
    counts[e.eventName] = (counts[e.eventName] || 0) + 1;
  }
  return counts;
}
      `.trim(),
    },
    {
      path: "README.md",
      content: "# Analytics Module\nTracks telemetry and user interaction events.",
    },
  ];

  // Execute ingestion job processing
  await processIngestionJob({ repositoryId: repo.id, userId });

  const updatedRepo = await repoService.getRepoById(repo.id);
  assert.ok(updatedRepo, "Repository must exist");
  assert.ok(updatedRepo.indexStatus === "indexed" || updatedRepo.indexStatus === "ready", "Repository status must transition to indexed/ready");

  // Check persisted files in in-memory dev store
  const storedFiles = await getRepoFiles(repo.id);
  assert.strictEqual(storedFiles.length, 4, "All 4 files must be persisted");

  // Check persisted chunks
  const storedChunks = await chunkService.getRepoChunks(repo.id);
  assert.ok(storedChunks && storedChunks.length >= 3, "Extracted AST chunks must be persisted");

  // Check vector store
  assert.strictEqual(devVectorStore.hasFile(repo.id, "src/auth/service.ts"), true, "Vector store must contain vector points for indexed files");
  assert.strictEqual(devVectorStore.hasFile(repo.id, "src/utils/crypto.ts"), true, "Vector store must contain vector points for crypto.ts");

  console.log(`  ✓ Ingestion job lifecycle passed: ${storedFiles.length} files, ${storedChunks.length} chunks, indexStatus: ${updatedRepo.indexStatus}`);

  // -------------------------------------------------------------------
  // 3. Retrieval Pipeline (Hybrid Fusion & File Diversity)
  // -------------------------------------------------------------------
  console.log("\n[Integration 3] Testing Hybrid Retrieval Pipeline (BM25 + Vector Fusion)...");

  // Query 1: Exact symbol search
  const retrieval1 = await retrievalService.hybridRetrieve(
    repo.id,
    "Where is validateUser defined?",
    5
  );

  assert.ok(retrieval1.results.length > 0, "Hybrid retrieval must return matching chunks");
  const topMatch = retrieval1.results[0];
  assert.strictEqual(topMatch.filePath, "src/auth/service.ts", "Top match must point to src/auth/service.ts");
  assert.ok(topMatch.symbolName?.includes("validateUser") || topMatch.symbolName?.includes("AuthService"), "Top match must cite AuthService or validateUser");
  assert.ok(topMatch.scoreBreakdown, "Score breakdown must be populated");

  // Query 2: Semantic concept search
  const retrieval2 = await retrievalService.hybridRetrieve(
    repo.id,
    "crypto hash data SHA-256 function",
    5
  );

  assert.ok(retrieval2.results.length > 0, "Semantic query must return matching chunks");
  const cryptoMatch = retrieval2.results.find((r) => r.filePath === "src/utils/crypto.ts");
  assert.ok(cryptoMatch, "Must retrieve crypto.ts chunk for hashData SHA-256");

  // Query 3: Multi-tenant isolation check (Querying with different repo ID returns zero)
  const emptyRetrieval = await retrievalService.hybridRetrieve(
    "unrelated-repo-999",
    "validateUser",
    5
  );
  assert.strictEqual(emptyRetrieval.results.length, 0, "Unrelated repository ID must return 0 results (Tenant Isolation)");

  console.log(`  ✓ Hybrid retrieval pipeline passed: exact symbol match (${topMatch.symbolName}), semantic retrieval, and tenant isolation`);

  console.log("\n=======================================================");
  console.log("  All Phase 14 Integration Tests Passed (3/3 Suites)!");
  console.log("=======================================================\n");
}

runIntegrationTests().catch((err) => {
  console.error("Integration test failed:", err);
  process.exit(1);
});
