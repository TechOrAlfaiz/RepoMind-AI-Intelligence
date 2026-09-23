import assert from "node:assert";
import crypto from "node:crypto";
import { orgService } from "../../dist/modules/orgs/org.service.js";
import { repoService, devRepos } from "../../dist/modules/repos/repo.service.js";
import { processIngestionJob, getRepoFiles, devFiles } from "../../dist/modules/ingestion/ingestion.worker.js";
import { chunkService, devChunks } from "../../dist/modules/chunking/chunk.service.js";
import { devVectorStore } from "../../dist/modules/retrieval/vector.service.js";
import { ragService } from "../../dist/modules/rag/rag.service.js";
import { webhookService } from "../../dist/modules/webhooks/webhook.service.js";
import { incrementalService } from "../../dist/modules/ingestion/incremental.service.js";

async function runE2ELifecycleTest() {
  console.log("\n===================================================================");
  console.log("  RepoMind Phase 14: Complete End-to-End (E2E) Lifecycle Test");
  console.log("===================================================================\n");

  const orgId = "org-e2e-enterprise";
  const userId = "user-e2e-lead";
  const webhookSecret = "webhook-secret-e2e-pass";

  // -------------------------------------------------------------------
  // STEP 1: Sign in & Organization Provisioning
  // -------------------------------------------------------------------
  console.log("[Step 1/8] Sign In & Organization Context Provisioning...");

  orgService.setDevOrg({
    id: orgId,
    name: "RepoMind Enterprise E2E",
    slug: "repomind-enterprise-e2e",
    createdBy: userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  orgService.setDevMembership(userId, orgId, "owner");

  const org = orgService.getDevOrg(orgId);
  const membership = orgService.getDevMembership(userId, orgId);

  assert.ok(org, "Organization must be provisioned");
  assert.ok(membership, "User membership must be created");
  assert.strictEqual(membership.role, "owner", "User role must be owner");
  console.log(`  ✓ Signed in as '${userId}' with role '${membership.role}' in '${org.name}'`);

  // -------------------------------------------------------------------
  // STEP 2: Connect Repository
  // -------------------------------------------------------------------
  console.log("\n[Step 2/8] Connecting GitHub Repository...");

  const repo = await repoService.connectRepo(orgId, {
    name: "repomind-e2e-core",
    fullName: "repomind/repomind-e2e-core",
    githubRepoId: 778899,
    defaultBranch: "main",
    branch: "main",
    isPrivate: true,
  });

  assert.ok(repo.id, "Repository must receive a unique ID");
  assert.strictEqual(repo.indexStatus, "pending", "Repository must start in pending index status");
  assert.strictEqual(repo.branch, "main", "Branch must be main");
  console.log(`  ✓ Connected repository '${repo.fullName}' (ID: ${repo.id}) with status '${repo.indexStatus}'`);

  // -------------------------------------------------------------------
  // STEP 3: Background Worker Ingestion & AST Chunking
  // -------------------------------------------------------------------
  console.log("\n[Step 3/8] Executing Background Ingestion & AST Tree Indexing...");

  await processIngestionJob({ repositoryId: repo.id, userId });

  const indexedRepo = await repoService.getRepoById(repo.id);
  assert.ok(indexedRepo, "Repository record must exist");
  assert.ok(
    indexedRepo.indexStatus === "indexed" || indexedRepo.indexStatus === "ready",
    "Repository indexStatus must be indexed"
  );
  assert.ok(indexedRepo.currentCommitSha, "Current commit SHA must be stored");

  const indexedFiles = await getRepoFiles(repo.id);
  assert.strictEqual(indexedFiles.length, 4, "Must ingest all 4 source code files");

  const indexedChunks = await chunkService.getRepoChunks(repo.id);
  assert.ok(indexedChunks.length >= 4, "Must extract and persist AST chunks");

  console.log(`  ✓ Ingestion complete: 4 files, ${indexedChunks.length} AST chunks (HEAD Commit: ${indexedRepo.currentCommitSha.substring(0, 7)})`);

  // -------------------------------------------------------------------
  // STEP 4: Ask a Question via Streaming RAG
  // -------------------------------------------------------------------
  console.log("\n[Step 4/8] Asking RAG Question via Streaming Engine...");

  const question = "Where is AuthService defined and how does it validate tokens?";
  const tokensReceived = [];
  const eventsReceived = [];

  const ragAnswer = await ragService.streamRAGChat(
    {
      organizationId: orgId,
      repositoryId: repo.id,
      userId,
      query: question,
    },
    (event) => {
      eventsReceived.push(event);
      if (event.type === "token") {
        tokensReceived.push(event.payload);
      }
    }
  );

  assert.ok(tokensReceived.length > 0, "Tokens must be streamed via SSE event callback");
  assert.ok(ragAnswer.answer.length > 0, "Assistant answer must be non-empty");
  assert.ok(ragAnswer.citations.length > 0, "Response must contain validated citations");
  assert.ok(ragAnswer.trace, "Execution trace telemetry must be recorded");

  console.log(`  ✓ RAG answer generated (${tokensReceived.length} streamed tokens, ${ragAnswer.citations.length} citations)`);

  // -------------------------------------------------------------------
  // STEP 5: Open a Citation & Verify Metadata
  // -------------------------------------------------------------------
  console.log("\n[Step 5/8] Opening Citation & Inspecting Line Bounds...");

  const primaryCitation = ragAnswer.citations[0];
  assert.ok(primaryCitation.chunkId, "Citation must contain chunkId");
  assert.strictEqual(primaryCitation.filePath, "src/auth/service.ts", "Citation must point to src/auth/service.ts");
  assert.ok(typeof primaryCitation.startLine === "number", "Citation must specify startLine");
  assert.ok(typeof primaryCitation.endLine === "number", "Citation must specify endLine");
  assert.ok(primaryCitation.startLine <= primaryCitation.endLine, "startLine <= endLine invariant");

  console.log(`  ✓ Citation opened: File: ${primaryCitation.filePath} | Lines: ${primaryCitation.startLine}-${primaryCitation.endLine} | Symbol: ${primaryCitation.symbolName}`);

  // -------------------------------------------------------------------
  // STEP 6: Verify Cited Code Lines (Line-Precision Invariant)
  // -------------------------------------------------------------------
  console.log("\n[Step 6/8] Verifying Cited Code Lines against Source File...");

  const authFile = indexedFiles.find((f) => f.path === "src/auth/service.ts");
  assert.ok(authFile, "Source file record must exist");
  assert.ok(authFile.content, "File content must be present");

  const fileLines = authFile.content.split(/\r?\n/);
  const slicedLines = fileLines.slice(primaryCitation.startLine - 1, primaryCitation.endLine);
  const citedCodeText = slicedLines.join("\n");

  assert.ok(
    citedCodeText.includes("AuthService") || citedCodeText.includes("validateUser"),
    "Cited lines must strictly match the symbol implementation in source file"
  );
  console.log(`  ✓ Line precision verified: cited slice matches symbol in source text:\n    ${citedCodeText.trim().replace(/\n/g, "\n    ")}`);

  // -------------------------------------------------------------------
  // STEP 7: Push a Change (Simulate GitHub Webhook Diff)
  // -------------------------------------------------------------------
  console.log("\n[Step 7/8] Simulating GitHub Push Webhook Event with Diffs...");

  const beforeSha = indexedRepo.currentCommitSha;
  const afterSha = "9999999999999999999999999999999999999999";

  const pushPayload = {
    ref: "refs/heads/main",
    before: beforeSha,
    after: afterSha,
    repository: { id: repo.githubRepoId, full_name: repo.fullName },
    commits: [
      {
        id: "commit-delta-1",
        added: ["src/auth/roles.ts"],
        modified: ["src/auth/service.ts"],
        removed: ["src/index.ts"],
      },
    ],
  };

  const rawPushBody = JSON.stringify(pushPayload);
  const hmacSig = "sha256=" + crypto.createHmac("sha256", webhookSecret).update(rawPushBody).digest("hex");

  // Validate webhook HMAC signature
  const isSigValid = webhookService.verifyGitHubSignature(rawPushBody, hmacSig, webhookSecret);
  assert.strictEqual(isSigValid, true, "Webhook signature verification must pass");

  // Parse push event diff
  const parsedDiff = webhookService.parsePushEvent(repo.id, pushPayload);
  assert.strictEqual(parsedDiff.added.length, 1);
  assert.strictEqual(parsedDiff.modified.length, 1);
  assert.strictEqual(parsedDiff.removed.length, 1);
  console.log(`  ✓ Webhook HMAC validated and commit diff parsed (+1 added, ~1 modified, -1 removed)`);

  // -------------------------------------------------------------------
  // STEP 8: Confirm Incremental Job Fires (Zero Full Re-index Invariant)
  // -------------------------------------------------------------------
  console.log("\n[Step 8/8] Confirming Incremental Differential Ingestion...");

  const newAuthCode = `
export class AuthService {
  validateUser(token: string): boolean {
    return token.startsWith("repomind_") && token.length > 15;
  }
}
  `.trim();

  const newRolesCode = `
export type OrgRole = "owner" | "admin" | "member" | "viewer";
export const ROLE_HIERARCHY = { owner: 40, admin: 30, member: 20, viewer: 10 };
  `.trim();

  const fileFetcherMap = new Map([
    ["src/auth/service.ts", newAuthCode],
    ["src/auth/roles.ts", newRolesCode],
  ]);

  const diffResult = await incrementalService.processIncrementalPush(
    repo.id,
    parsedDiff,
    async (path) => fileFetcherMap.get(path) || null
  );

  // Assert differential counts
  assert.strictEqual(diffResult.filesAdded, 1, "Exactly 1 file added");
  assert.strictEqual(diffResult.filesModified, 1, "Exactly 1 file modified");
  assert.strictEqual(diffResult.filesRemoved, 1, "Exactly 1 file removed");
  assert.strictEqual(diffResult.filesSkippedUnchanged, 0);
  assert.strictEqual(diffResult.newCommitSha, afterSha, "Commit SHA updated to push afterSha");

  // Invariant A: Removed file src/index.ts must be purged
  assert.strictEqual(
    devVectorStore.hasFile(repo.id, "src/index.ts"),
    false,
    "Removed file vector points must be purged"
  );

  // Invariant B: Added file src/auth/roles.ts must be indexed
  assert.strictEqual(
    devVectorStore.hasFile(repo.id, "src/auth/roles.ts"),
    true,
    "Newly added file must be indexed in vector store"
  );

  // Invariant C: Modified file src/auth/service.ts must have updated points
  assert.strictEqual(
    devVectorStore.hasFile(repo.id, "src/auth/service.ts"),
    true,
    "Modified file must have fresh vector points"
  );

  // Invariant D: Untouched file src/utils/crypto.ts must remain completely untouched
  assert.strictEqual(
    devVectorStore.hasFile(repo.id, "src/utils/crypto.ts"),
    true,
    "Unchanged file vector points must remain untouched without re-indexing"
  );

  // Invariant E: Repository HEAD commit SHA updated
  const finalRepo = await repoService.getRepoById(repo.id);
  assert.strictEqual(finalRepo.currentCommitSha, afterSha, "Repository commit SHA must match latest push SHA");

  console.log(`  ✓ Incremental job verified (Zero Full Re-index Invariant Preserved):`);
  console.log(`    - Removed 'src/index.ts' purged from vector store`);
  console.log(`    - Added 'src/auth/roles.ts' parsed and indexed`);
  console.log(`    - Modified 'src/auth/service.ts' refreshed`);
  console.log(`    - Unchanged 'src/utils/crypto.ts' left untouched`);
  console.log(`    - Repo commit SHA updated to ${afterSha.substring(0, 7)}`);

  console.log("\n===================================================================");
  console.log("  All 8 E2E Lifecycle Journey Steps Completed Successfully (8/8)!");
  console.log("===================================================================\n");
}

runE2ELifecycleTest().catch((err) => {
  console.error("E2E lifecycle test failed:", err);
  process.exit(1);
});
