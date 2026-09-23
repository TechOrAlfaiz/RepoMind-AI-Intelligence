// apps/api/test-vector-retrieval.mjs
// Comprehensive test for Phase 7 Embeddings and Scoped Vector Retrieval

import { embeddingService, l2Normalize } from "./dist/modules/retrieval/embedding.service.js";
import { vectorService, cosineSimilarity, devVectorStore } from "./dist/modules/retrieval/vector.service.js";
import { retrievalService } from "./dist/modules/retrieval/retrieval.service.js";

console.log("=========================================================");
console.log("    REPOMIND PHASE 7: EMBEDDINGS & VECTOR RETRIEVAL TEST ");
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

// 1. Test Embedding Provider & L2 Normalization
console.log("\n[1] Testing Embedding Service & Vector Dimensions...");

const testQuery = "Where is AES-256 GCM token encryption configured?";
const queryVector = await embeddingService.embedQuery(testQuery);

assert(Array.isArray(queryVector), "Query embedding returned an array");
assert(queryVector.length === 1536, `Embedding has exactly 1536 dimensions (got ${queryVector.length})`);

// Verify L2 Unit Norm
let sumSq = 0;
for (const v of queryVector) sumSq += v * v;
const norm = Math.sqrt(sumSq);
assert(Math.abs(norm - 1.0) < 1e-4, `Vector is strictly L2 unit normalized (norm = ${norm.toFixed(6)})`);

// 2. Test Semantic Proximity
console.log("\n[2] Testing Semantic Similarity & Cosine Calculations...");

const authQueryVec = await embeddingService.embedQuery("authenticate user session and oauth token");
const authDocVec = await embeddingService.embedQuery("function verifySession(sessionCookie: string): Promise<UserSession>");
const gardeningDocVec = await embeddingService.embedQuery("function waterPlants(soilMoisture: number): boolean");

const authSim = cosineSimilarity(authQueryVec, authDocVec);
const unrelatedSim = cosineSimilarity(authQueryVec, gardeningDocVec);

console.log(`  - Cosine Similarity (Auth Query vs Auth Doc): ${authSim.toFixed(4)}`);
console.log(`  - Cosine Similarity (Auth Query vs Unrelated Doc): ${unrelatedSim.toFixed(4)}`);

assert(authSim > unrelatedSim, "Related document has higher cosine similarity than unrelated document");

// 3. Test Vector Upsert & Strict Repository Scope Isolation
console.log("\n[3] Testing Strict Repository Scoping & Zero Cross-Tenant Leakage...");

const repoA = "repo_tenant_alpha_111";
const repoB = "repo_tenant_beta_222";

// Chunks for Repo A (Auth / Security)
const chunksRepoA = [
  {
    id: "chunk_a_1",
    repositoryId: repoA,
    fileId: "file_crypto_1",
    symbolName: "encryptSecretToken",
    startLine: 12,
    endLine: 35,
    content: `export function encryptSecretToken(secret: string): EncryptedVault {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", vaultKey, iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return { encrypted: encrypted.toString("hex"), iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex") };
}`,
    contentHash: "hash_crypto_111",
    chunkType: "function",
    embeddingVersion: 1,
    header: {
      repository: "acme/auth-vault",
      path: "src/utils/crypto.ts",
      symbolName: "encryptSecretToken",
      language: "typescript",
      scope: "function",
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: "chunk_a_2",
    repositoryId: repoA,
    fileId: "file_auth_2",
    symbolName: "verifyGitHubOAuthCallback",
    startLine: 40,
    endLine: 65,
    content: `export async function verifyGitHubOAuthCallback(code: string, state: string): Promise<SessionUser> {
  const token = await exchangeCodeForToken(code);
  const user = await fetchGitHubUser(token);
  return user;
}`,
    contentHash: "hash_auth_222",
    chunkType: "function",
    embeddingVersion: 1,
    header: {
      repository: "acme/auth-vault",
      path: "src/auth/service.ts",
      symbolName: "verifyGitHubOAuthCallback",
      language: "typescript",
      scope: "function",
    },
    createdAt: new Date().toISOString(),
  },
];

// Chunks for Repo B (Billing / Stripe)
const chunksRepoB = [
  {
    id: "chunk_b_1",
    repositoryId: repoB,
    fileId: "file_billing_1",
    symbolName: "handleStripeWebhook",
    startLine: 1,
    endLine: 45,
    content: `export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  if (event.type === 'invoice.payment_succeeded') {
    await updateSubscriptionTier(event.data.object.customer);
  }
}`,
    contentHash: "hash_billing_333",
    chunkType: "function",
    embeddingVersion: 1,
    header: {
      repository: "beta-corp/payments",
      path: "src/billing/stripe.ts",
      symbolName: "handleStripeWebhook",
      language: "typescript",
      scope: "function",
    },
    createdAt: new Date().toISOString(),
  },
];

// Embed chunks for both repos
const embeddingsA = await embeddingService.embedChunks(chunksRepoA);
const embeddingsB = await embeddingService.embedChunks(chunksRepoB);

const pathMapA = new Map([["file_crypto_1", "src/utils/crypto.ts"], ["file_auth_2", "src/auth/service.ts"]]);
const pathMapB = new Map([["file_billing_1", "src/billing/stripe.ts"]]);

await vectorService.upsertChunks(repoA, chunksRepoA, embeddingsA, pathMapA);
await vectorService.upsertChunks(repoB, chunksRepoB, embeddingsB, pathMapB);

console.log("  - Upserted chunks for Repo A and Repo B into vector store.");

// Query Repo A for encryption
const retrieveResA = await retrievalService.retrieveChunks({
  repositoryId: repoA,
  query: "Where is AES-256 GCM token encryption implemented?",
  limit: 5,
});

console.log(`  - Querying Repo A: Found ${retrieveResA.results.length} matches in ${retrieveResA.queryLatencyMs}ms`);
assert(retrieveResA.results.length > 0, "Found at least 1 match in Repo A");
assert(retrieveResA.results[0].symbolName === "encryptSecretToken", "Top match in Repo A is encryptSecretToken");
assert(retrieveResA.results[0].repositoryId === repoA, "Top match repositoryId strictly equals Repo A");
assert(retrieveResA.results[0].filePath === "src/utils/crypto.ts", "File path correctly populated in retrieved chunk");
assert(retrieveResA.results[0].startLine === 12 && retrieveResA.results[0].endLine === 35, "Line precision verified (12-35)");

// CRITICAL ISOLATION TEST: Query Repo A with a billing/stripe query (which only exists in Repo B)
const crossQueryRes = await retrievalService.retrieveChunks({
  repositoryId: repoA,
  query: "Stripe invoice payment webhook customer subscription",
  limit: 5,
});

console.log(`  - Cross-querying Repo A for Stripe billing terms: ${crossQueryRes.results.length} matches returned`);
const leakedChunks = crossQueryRes.results.filter((c) => c.repositoryId === repoB || c.filePath.includes("stripe"));
assert(leakedChunks.length === 0, "ZERO chunks from Repo B were returned when querying Repo A (Zero cross-tenant leakage)");

// Query Repo B for billing
const retrieveResB = await retrievalService.retrieveChunks({
  repositoryId: repoB,
  query: "Stripe invoice payment webhook customer subscription",
  limit: 5,
});

console.log(`  - Querying Repo B: Found ${retrieveResB.results.length} matches`);
assert(retrieveResB.results.length > 0, "Found matches in Repo B for Stripe webhook");
assert(retrieveResB.results[0].repositoryId === repoB, "Results belong exclusively to Repo B");
assert(retrieveResB.results[0].symbolName === "handleStripeWebhook", "Top match in Repo B is handleStripeWebhook");

// 4. Test Cascading Vector Deletion
console.log("\n[4] Testing Cascading Vector Deletion...");

await vectorService.deleteRepoVectors(repoA);
const postDeleteRes = await retrievalService.retrieveChunks({
  repositoryId: repoA,
  query: "encryptSecretToken",
  limit: 5,
});

assert(postDeleteRes.results.length === 0, "Deleted repository returns 0 vector results after cascading deletion");

console.log("\n=========================================================");
console.log(`TEST RUN COMPLETE: ${testsPassed}/${testsTotal} passed.`);
console.log("=========================================================");
