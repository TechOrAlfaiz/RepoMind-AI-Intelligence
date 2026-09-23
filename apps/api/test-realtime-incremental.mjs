import assert from "node:assert";
import crypto from "node:crypto";
import { webhookService } from "./dist/modules/webhooks/webhook.service.js";
import { incrementalService } from "./dist/modules/ingestion/incremental.service.js";
import { webSocketService } from "./dist/modules/realtime/websocket.service.js";
import { devRepos } from "./dist/modules/repos/repo.service.js";
import { devFiles, computeContentHash } from "./dist/modules/ingestion/ingestion.worker.js";
import { devChunks } from "./dist/modules/chunking/chunk.service.js";
import { devVectorStore } from "./dist/modules/retrieval/vector.service.js";

async function runTests() {
  console.log("\n=======================================================");
  console.log("  RepoMind Phase 11 Realtime & Incremental Test Suite");
  console.log("=======================================================\n");

  const repoId = "repo-inc-test-01";
  const secret = "super-secret-webhook-key-12345";

  // -------------------------------------------------------------------
  // TEST 1: GitHub Webhook HMAC SHA-256 Signature Verification
  // -------------------------------------------------------------------
  console.log("[Test 1] Verifying GitHub Webhook HMAC SHA-256 Signatures...");
  const rawPayload = JSON.stringify({
    ref: "refs/heads/main",
    before: "1111111111111111111111111111111111111111",
    after: "2222222222222222222222222222222222222222",
  });

  const validHmac = crypto.createHmac("sha256", secret).update(rawPayload, "utf8").digest("hex");
  const validHeader = `sha256=${validHmac}`;
  const invalidHeader = `sha256=${"0".repeat(64)}`;

  const isValid = webhookService.verifyGitHubSignature(rawPayload, validHeader, secret);
  assert.strictEqual(isValid, true, "Valid HMAC signature should pass verification");

  const isInvalid = webhookService.verifyGitHubSignature(rawPayload, invalidHeader, secret);
  assert.strictEqual(isInvalid, false, "Invalid HMAC signature must fail verification");

  const isTampered = webhookService.verifyGitHubSignature(rawPayload + "tampered", validHeader, secret);
  assert.strictEqual(isTampered, false, "Tampered payload must fail verification");

  console.log("  ✓ HMAC SHA-256 signature verification & timingSafeEqual passed.");

  // -------------------------------------------------------------------
  // TEST 2: Push Commit Diff Aggregator
  // -------------------------------------------------------------------
  console.log("\n[Test 2] Testing Push Commit Diff Aggregator across multiple commits...");
  const samplePushPayload = {
    ref: "refs/heads/main",
    before: "0000000000000000000000000000000000000000",
    after: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    commits: [
      {
        id: "commit-1",
        added: ["src/featureA.ts", "src/temp.ts"],
        modified: ["src/config.ts"],
        removed: [],
      },
      {
        id: "commit-2",
        added: ["src/featureB.ts"],
        modified: ["src/featureA.ts"],
        removed: ["src/temp.ts", "src/deprecated.ts"],
      },
    ],
  };

  const parsedDiff = webhookService.parsePushEvent(repoId, samplePushPayload);
  assert.strictEqual(parsedDiff.repositoryId, repoId);
  assert.strictEqual(parsedDiff.ref, "refs/heads/main");
  assert.strictEqual(parsedDiff.afterSha, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
  assert.ok(parsedDiff.added.includes("src/featureB.ts"), "Diff should contain added files");
  assert.ok(parsedDiff.removed.includes("src/deprecated.ts"), "Diff should contain removed files");
  assert.ok(parsedDiff.modified.includes("src/config.ts"), "Diff should contain modified files");
  console.log("  ✓ Multi-commit push event aggregation passed.");

  // -------------------------------------------------------------------
  // TEST 3: Incremental Invariant & Differential Processing
  // -------------------------------------------------------------------
  console.log("\n[Test 3] Testing Incremental Indexing Invariant (Zero Full Re-index)...");

  // Setup seed repository
  devRepos.set(repoId, {
    id: repoId,
    organizationId: "org-1",
    name: "repomind-sample",
    fullName: "acme/repomind-sample",
    githubRepoId: 998877,
    defaultBranch: "main",
    branch: "main",
    indexStatus: "ready",
    indexVersion: 1,
    currentCommitSha: "1111111111111111111111111111111111111111",
    fileCount: 3,
    chunkCount: 3,
    totalLines: 100,
    lastIndexedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Seed 3 initial files
  // 1. Unchanged file: src/utils.ts
  const utilsContent = `export function add(a: number, b: number): number {\n  return a + b;\n}\n`;
  const utilsHash = computeContentHash(utilsContent);
  const utilsFileId = "file-utils-1";
  devFiles.set(utilsFileId, {
    id: utilsFileId,
    repositoryId: repoId,
    path: "src/utils.ts",
    language: "typescript",
    contentHash: utilsHash,
    latestSha: "1111111111111111111111111111111111111111",
    size: utilsContent.length,
    content: utilsContent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const utilsChunkId = "chunk-utils-1";
  devChunks.set(utilsChunkId, {
    id: utilsChunkId,
    repositoryId: repoId,
    fileId: utilsFileId,
    filePath: "src/utils.ts",
    startLine: 1,
    endLine: 3,
    lineCount: 3,
    symbolName: "add",
    symbolType: "function",
    content: utilsContent,
    contentHash: computeContentHash(utilsContent),
    language: "typescript",
    header: { repository: "repomind-sample", path: "src/utils.ts", symbolName: "add", language: "typescript" },
    createdAt: new Date().toISOString(),
  });
  devVectorStore.upsert([{
    id: utilsChunkId,
    vector: new Array(1536).fill(0.1),
    payload: { chunkId: utilsChunkId, repositoryId: repoId, filePath: "src/utils.ts", fileId: utilsFileId, symbolName: "add" },
  }]);

  // 2. File to be modified: src/auth.ts
  const oldAuthContent = `export function login(user: string): boolean {\n  return !!user;\n}\n`;
  const authFileId = "file-auth-1";
  devFiles.set(authFileId, {
    id: authFileId,
    repositoryId: repoId,
    path: "src/auth.ts",
    language: "typescript",
    contentHash: computeContentHash(oldAuthContent),
    latestSha: "1111111111111111111111111111111111111111",
    size: oldAuthContent.length,
    content: oldAuthContent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const oldAuthChunkId = "chunk-auth-old-1";
  devChunks.set(oldAuthChunkId, {
    id: oldAuthChunkId,
    repositoryId: repoId,
    fileId: authFileId,
    filePath: "src/auth.ts",
    startLine: 1,
    endLine: 3,
    lineCount: 3,
    symbolName: "login",
    symbolType: "function",
    content: oldAuthContent,
    contentHash: computeContentHash(oldAuthContent),
    language: "typescript",
    header: { repository: "repomind-sample", path: "src/auth.ts", symbolName: "login", language: "typescript" },
    createdAt: new Date().toISOString(),
  });
  devVectorStore.upsert([{
    id: oldAuthChunkId,
    vector: new Array(1536).fill(0.2),
    payload: { chunkId: oldAuthChunkId, repositoryId: repoId, filePath: "src/auth.ts", fileId: authFileId, symbolName: "login" },
  }]);

  // 3. File to be removed: src/deprecated.ts
  const depContent = `export const DEPRECATED = true;\n`;
  const depFileId = "file-dep-1";
  devFiles.set(depFileId, {
    id: depFileId,
    repositoryId: repoId,
    path: "src/deprecated.ts",
    language: "typescript",
    contentHash: computeContentHash(depContent),
    latestSha: "1111111111111111111111111111111111111111",
    size: depContent.length,
    content: depContent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const depChunkId = "chunk-dep-1";
  devChunks.set(depChunkId, {
    id: depChunkId,
    repositoryId: repoId,
    fileId: depFileId,
    filePath: "src/deprecated.ts",
    startLine: 1,
    endLine: 1,
    lineCount: 1,
    symbolName: "DEPRECATED",
    symbolType: "statement",
    content: depContent,
    contentHash: computeContentHash(depContent),
    language: "typescript",
    header: { repository: "repomind-sample", path: "src/deprecated.ts", symbolName: "DEPRECATED", language: "typescript" },
    createdAt: new Date().toISOString(),
  });
  devVectorStore.upsert([{
    id: depChunkId,
    vector: new Array(1536).fill(0.3),
    payload: { chunkId: depChunkId, repositoryId: repoId, filePath: "src/deprecated.ts", fileId: depFileId, symbolName: "DEPRECATED" },
  }]);

  // Setup WebSocket progress listener
  const capturedEvents = [];
  const unsubscribeWs = webSocketService.onProgress((event) => {
    if (event.repositoryId === repoId) {
      capturedEvents.push(event);
    }
  });

  // Define the incremental diff:
  // - added: src/feature.ts
  // - modified: src/auth.ts
  // - removed: src/deprecated.ts
  // (src/utils.ts is untouched and absent from diff)
  const newAuthContent = `export function login(user: string, token: string): boolean {\n  if (!token) return false;\n  return Boolean(user && token.length > 8);\n}\n`;
  const newFeatureContent = `export class SmartCache<K, V> {\n  private store = new Map<K, V>();\n  get(k: K): V | undefined { return this.store.get(k); }\n  set(k: K, v: V): void { this.store.set(k, v); }\n}\n`;

  const pushDiff = {
    repositoryId: repoId,
    ref: "refs/heads/main",
    beforeSha: "1111111111111111111111111111111111111111",
    afterSha: "2222222222222222222222222222222222222222",
    added: ["src/feature.ts"],
    modified: ["src/auth.ts"],
    removed: ["src/deprecated.ts"],
  };

  const fetchContentMap = new Map([
    ["src/auth.ts", newAuthContent],
    ["src/feature.ts", newFeatureContent],
  ]);

  const result = await incrementalService.processIncrementalPush(
    repoId,
    pushDiff,
    async (path) => fetchContentMap.get(path) || null,
  );

  unsubscribeWs();

  // Validate incremental counts
  assert.strictEqual(result.filesAdded, 1, "Should add exactly 1 file");
  assert.strictEqual(result.filesModified, 1, "Should modify exactly 1 file");
  assert.strictEqual(result.filesRemoved, 1, "Should remove exactly 1 file");
  assert.strictEqual(result.filesSkippedUnchanged, 0, "No modified files were skipped as unchanged");
  assert.strictEqual(result.newCommitSha, "2222222222222222222222222222222222222222");

  // Invariant 1: Unchanged file src/utils.ts must remain completely intact
  assert.ok(devFiles.has(utilsFileId), "src/utils.ts file record must remain untouched");
  assert.ok(devChunks.has(utilsChunkId), "src/utils.ts chunk must remain untouched");
  assert.ok(devVectorStore.hasChunk(utilsChunkId), "src/utils.ts vector point must remain untouched");

  // Invariant 2: Removed file src/deprecated.ts must be completely purged
  assert.strictEqual(devFiles.has(depFileId), false, "src/deprecated.ts file record must be purged");
  assert.strictEqual(devChunks.has(depChunkId), false, "src/deprecated.ts chunks must be deleted");
  assert.strictEqual(devVectorStore.hasChunk(depChunkId), false, "src/deprecated.ts vector points must be purged");

  // Invariant 3: Modified file src/auth.ts old chunk/vector must be purged, and new chunks created
  assert.strictEqual(devChunks.has(oldAuthChunkId), false, "Old auth chunk must be deleted");
  assert.strictEqual(devVectorStore.hasChunk(oldAuthChunkId), false, "Old auth vector must be deleted");
  const authFileInStore = devFiles.get(authFileId);
  assert.strictEqual(authFileInStore.contentHash, computeContentHash(newAuthContent));

  // Invariant 4: Added file src/feature.ts must have file record, chunks, and vector points
  let featureFile = null;
  for (const f of devFiles.values()) {
    if (f.repositoryId === repoId && f.path === "src/feature.ts") {
      featureFile = f;
      break;
    }
  }
  assert.ok(featureFile, "src/feature.ts file record must exist");
  const featureChunks = Array.from(devChunks.values()).filter(
    (c) => (c.header && c.header.path === "src/feature.ts") || c.filePath === "src/feature.ts"
  );
  assert.ok(featureChunks.length > 0, "src/feature.ts must produce AST chunks");
  for (const c of featureChunks) {
    assert.ok(devVectorStore.hasChunk(c.id), `Vector store must contain vector point for chunk ${c.id}`);
  }

  // Invariant 5: Repository commit SHA updated
  const updatedRepo = devRepos.get(repoId);
  assert.strictEqual(updatedRepo.currentCommitSha, "2222222222222222222222222222222222222222");

  console.log("  ✓ Incremental Invariant Verified: Unchanged files untouched, removed purged, modified refreshed, added ingested.");

  // -------------------------------------------------------------------
  // TEST 4: Realtime WebSocket Progress Event Streaming
  // -------------------------------------------------------------------
  console.log("\n[Test 4] Testing Realtime WebSocket Progress Streaming...");
  assert.ok(capturedEvents.length >= 3, "Should capture multiple realtime progress stages");
  const stages = capturedEvents.map((e) => e.stage);
  assert.ok(stages.includes("filtering"), "Must broadcast filtering stage");
  assert.ok(stages.includes("chunking"), "Must broadcast chunking stage");
  assert.ok(stages.includes("completed"), "Must broadcast completed stage");

  const lastEvent = capturedEvents[capturedEvents.length - 1];
  assert.strictEqual(lastEvent.stage, "completed");
  assert.strictEqual(lastEvent.percent, 100);
  console.log(`  ✓ Captured ${capturedEvents.length} sequential WebSocket progress events ending at 100%.`);

  // -------------------------------------------------------------------
  // TEST 5: Skip Modified File If Content Hash Unchanged
  // -------------------------------------------------------------------
  console.log("\n[Test 5] Testing Skip Re-indexing When Modified Content Hash Is Identical...");
  const noopDiff = {
    repositoryId: repoId,
    ref: "refs/heads/main",
    beforeSha: "2222222222222222222222222222222222222222",
    afterSha: "3333333333333333333333333333333333333333",
    added: [],
    modified: ["src/feature.ts"], // Send same content
    removed: [],
  };

  const noopResult = await incrementalService.processIncrementalPush(
    repoId,
    noopDiff,
    async () => newFeatureContent,
  );

  assert.strictEqual(noopResult.filesModified, 0, "No files should be re-indexed if content hash is identical");
  assert.strictEqual(noopResult.filesSkippedUnchanged, 1, "Should skip unchanged file");
  console.log("  ✓ Unchanged modified file was correctly skipped (content hash match).");

  console.log("\n=======================================================");
  console.log("  🎉 ALL PHASE 11 REALTIME & INCREMENTAL TESTS PASSED!");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
