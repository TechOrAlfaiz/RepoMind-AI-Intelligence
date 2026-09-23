// apps/api/test-rag-chat.mjs
// Comprehensive test for Phase 8 RAG Chat with Strict Citation Validation

import { promptBuilder } from "./dist/modules/rag/prompt-builder.js";
import { citationValidator } from "./dist/modules/rag/citation-validator.js";
import { ragService } from "./dist/modules/rag/rag.service.js";
import { vectorService } from "./dist/modules/retrieval/vector.service.js";
import { embeddingService } from "./dist/modules/retrieval/embedding.service.js";

console.log("=========================================================");
console.log("     REPOMIND PHASE 8: RAG CHAT & CITATIONS TEST         ");
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

// 1. Test Prompt Sandboxing & Untrusted Data Framing
console.log("\n[1] Testing Prompt Sandboxing & Untrusted Framing...");

const mockChunks = [
  {
    chunkId: "chunk_auth_1",
    repositoryId: "repo_test_101",
    fileId: "file_auth",
    filePath: "src/auth/vault.ts",
    symbolName: "decryptToken",
    chunkType: "function",
    startLine: 20,
    endLine: 45,
    content: "export function decryptToken(encrypted: string, tag: string) { /* AES-GCM */ }",
    contextualHeader: "// Repo: acme/core | Path: src/auth/vault.ts",
    language: "typescript",
    score: 0.95,
  },
  {
    chunkId: "chunk_auth_2",
    repositoryId: "repo_test_101",
    fileId: "file_session",
    filePath: "src/auth/session.ts",
    symbolName: "createSession",
    chunkType: "function",
    startLine: 10,
    endLine: 30,
    content: "export function createSession(userId: string) { /* Cookie session */ }",
    contextualHeader: "// Repo: acme/core | Path: src/auth/session.ts",
    language: "typescript",
    score: 0.88,
  },
];

const promptResult = promptBuilder.buildPrompt("How does token decryption work?", mockChunks);

assert(promptResult.formattedBlocks.includes("[CTX-1] File: src/auth/vault.ts (lines 20-45)"), "Context block 1 formatted with [CTX-1] and line range");
assert(promptResult.formattedBlocks.includes("[CTX-2] File: src/auth/session.ts (lines 10-30)"), "Context block 2 formatted with [CTX-2] and line range");
assert(promptResult.userPrompt.includes("BEGIN UNTRUSTED REPOSITORY CONTEXT"), "Prompt contains UNTRUSTED context opening boundary");
assert(promptResult.userPrompt.includes("END UNTRUSTED REPOSITORY CONTEXT"), "Prompt contains UNTRUSTED context closing boundary");
assert(promptResult.systemPrompt.includes("UNTRUSTED DATA BOUNDARY"), "System instructions enforce untrusted data boundary rules");

// 2. Test Citation Validator (Non-Negotiable Verification & Stripping)
console.log("\n[2] Testing Citation Validator & Hallucination Suppression...");

const validModelResponse = "The token is decrypted using AES-GCM in decryptToken [CTX-1]. Session is managed separately [CTX-2].";
const validation1 = citationValidator.validate(validModelResponse, mockChunks);

assert(validation1.validCount === 2, "Validated 2 legitimate citations");
assert(validation1.invalidCount === 0, "Zero invalid citations in clean response");
assert(validation1.validatedCitations.length === 2, "Generated 2 validated citation metadata objects");
assert(validation1.validatedCitations[0].chunkId === "chunk_auth_1", "Citation 1 maps to chunk_auth_1");
assert(validation1.validatedCitations[0].filePath === "src/auth/vault.ts", "Citation 1 has correct file path");
assert(validation1.validatedCitations[0].startLine === 20 && validation1.validatedCitations[0].endLine === 45, "Citation 1 has exact line range (20-45)");

// Adversarial test: Model hallucinates citation [CTX-99] and [CTX-5] (out of range)
const adversarialResponse = "Fake claim [CTX-99] followed by another hallucination [CTX-5], but legitimate decrypt logic is [CTX-1].";
const validation2 = citationValidator.validate(adversarialResponse, mockChunks);

assert(validation2.invalidCount === 2, "Detected 2 hallucinated citations ([CTX-99], [CTX-5])");
assert(validation2.validCount === 1, "Detected 1 legitimate citation ([CTX-1])");
assert(!validation2.sanitizedResponse.includes("[CTX-99]"), "Hallucinated citation [CTX-99] was stripped from response text");
assert(!validation2.sanitizedResponse.includes("[CTX-5]"), "Hallucinated citation [CTX-5] was stripped from response text");
assert(validation2.sanitizedResponse.includes("[CTX-1]"), "Valid citation [CTX-1] was preserved in sanitized response");

// 3. Test Full RAG Chat Streaming & Telemetry Trace Persistence
console.log("\n[3] Testing End-to-End RAG Chat Streaming & Trace Persistence...");

const testRepoId = "repo_rag_test_909";
const testOrgId = "org_rag_test_808";
const testUserId = "user_rag_test_707";

// Upsert a test chunk into the vector store
const testChunksForRag = [
  {
    id: "chunk_rag_crypto_1",
    repositoryId: testRepoId,
    fileId: "file_crypto_1",
    symbolName: "secureTokenVault",
    startLine: 15,
    endLine: 40,
    content: "export function secureTokenVault(secret: string): string {\n  return 'encrypted_token_aes_256_gcm';\n}",
    contentHash: "hash_rag_111",
    chunkType: "function",
    embeddingVersion: 1,
    header: {
      repository: "acme/repomind",
      path: "src/security/vault.ts",
      symbolName: "secureTokenVault",
      language: "typescript",
      scope: "function",
    },
    createdAt: new Date().toISOString(),
  },
];

const embeddings = await embeddingService.embedChunks(testChunksForRag);
const pathMap = new Map([["file_crypto_1", "src/security/vault.ts"]]);
await vectorService.upsertChunks(testRepoId, testChunksForRag, embeddings, pathMap);

const streamedTokens = [];
const streamedEvents = [];

const ragResult = await ragService.streamRAGChat(
  {
    organizationId: testOrgId,
    repositoryId: testRepoId,
    userId: testUserId,
    query: "Where is secureTokenVault defined?",
  },
  (event) => {
    streamedEvents.push(event);
    if (event.type === "token") {
      streamedTokens.push(event.payload);
    }
  },
);

assert(streamedTokens.length > 0, `Received ${streamedTokens.length} streamed tokens over SSE callback`);
assert(ragResult.answer.length > 0, "Generated non-empty answer");
assert(ragResult.citations.length > 0, "Answer contains at least 1 validated citation");
assert(ragResult.citations[0].filePath === "src/security/vault.ts", "Citation points to src/security/vault.ts");
assert(ragResult.citations[0].startLine === 15, "Citation line start is 15");

// Verify Full Trace Payload
assert(!!ragResult.trace, "Full execution trace object is present");
assert(ragResult.trace.retrievedChunkIds.length > 0, "Trace contains retrievedChunkIds");
assert(ragResult.trace.prompt.includes("secureTokenVault"), "Trace contains full prompt");
assert(ragResult.trace.response === ragResult.answer, "Trace contains full assistant response");
assert(typeof ragResult.trace.latencyMs === "number", "Trace records latencyMs");
assert(ragResult.trace.tokenUsage.totalTokens > 0, "Trace records tokenUsage");

// 4. Test Conversation & Message History Retrieval
console.log("\n[4] Testing Conversation Threading & Message Persistence...");

const convos = await ragService.listConversations(testRepoId, testUserId);
assert(convos.length > 0, "Found saved conversation in conversation store");

const messages = await ragService.getMessages(convos[0].id);
assert(messages.length >= 2, `Conversation history contains ${messages.length} messages (user + assistant)`);
assert(messages[0].role === "user", "First message is role: user");
assert(messages[1].role === "assistant", "Second message is role: assistant");
assert(messages[1].citations && messages[1].citations.length > 0, "Persisted assistant message includes validated citations");
assert(!!messages[1].trace, "Persisted assistant message includes full trace payload");

console.log("\n=========================================================");
console.log(`TEST RUN COMPLETE: ${testsPassed}/${testsTotal} passed.`);
console.log("=========================================================");
