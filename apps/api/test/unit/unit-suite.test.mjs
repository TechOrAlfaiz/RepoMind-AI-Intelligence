import assert from "node:assert";
import crypto from "node:crypto";
import { chunkCodeFile, formatContextualHeader } from "../../dist/modules/chunking/parsers/ast-chunker.js";
import { computeContentHash } from "../../dist/modules/ingestion/ingestion.worker.js";
import { PromptBuilder } from "../../dist/modules/rag/prompt-builder.js";
import { CitationValidator } from "../../dist/modules/rag/citation-validator.js";
import { WebhookService } from "../../dist/modules/webhooks/webhook.service.js";
import { ROLE_HIERARCHY } from "@repomind/shared-types";
import { requireOrgRole } from "../../dist/middlewares/auth.middleware.js";
import { orgService } from "../../dist/modules/orgs/org.service.js";

async function runUnitTests() {
  console.log("\n=======================================================");
  console.log("  RepoMind Phase 14: Automated Unit Test Suite");
  console.log("=======================================================\n");

  // -------------------------------------------------------------------
  // 1. AST Chunking Tests (TypeScript & Python)
  // -------------------------------------------------------------------
  console.log("[Unit 1] Testing AST Chunking (Tree-sitter Boundaries & Splitting)...");

  const tsCode = `
export interface SecurityToken {
  id: string;
  scope: string;
}

export class VaultService {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  public getSecret(): string {
    return this.secret;
  }
}

export function decryptPayload(payload: string): string {
  return "decrypted:" + payload;
}
  `.trim();

  const tsChunks = chunkCodeFile("repomind", "src/vault.ts", "typescript", tsCode);
  assert.ok(tsChunks.length >= 3, "Should extract interface, class, and function chunks");

  const interfaceChunk = tsChunks.find((c) => c.symbolName === "SecurityToken");
  assert.ok(interfaceChunk, "Should extract SecurityToken interface chunk");
  assert.strictEqual(interfaceChunk.chunkType, "interface");
  assert.strictEqual(interfaceChunk.header.path, "src/vault.ts");
  const formattedHeader = formatContextualHeader(interfaceChunk.header);
  assert.ok(formattedHeader.includes("SecurityToken"), "Context header must include symbol");

  const classChunk = tsChunks.find((c) => c.symbolName === "VaultService");
  assert.ok(classChunk, "Should extract VaultService class chunk");
  assert.strictEqual(classChunk.chunkType, "class");

  const fnChunk = tsChunks.find((c) => c.symbolName === "decryptPayload");
  assert.ok(fnChunk, "Should extract decryptPayload function chunk");
  assert.strictEqual(fnChunk.chunkType, "function");

  // Verify oversized symbol splitting (methods > 60 lines)
  const longMethodBody = Array.from({ length: 90 }, (_, i) => `    const v${i} = ${i} * 2;`).join("\n");
  const largeTsCode = `
export class BigService {
  public massiveOperation() {
${longMethodBody}
    return "done";
  }
}
  `.trim();

  const splitChunks = chunkCodeFile("repomind", "src/big.ts", "typescript", largeTsCode);
  assert.ok(splitChunks.length >= 2, "Methods exceeding 60 lines must be split into multiple sub-chunks");
  assert.ok(splitChunks[0].symbolName?.includes("BigService.massiveOperation"), "Split chunk preserves symbol hierarchy");

  console.log(`  ✓ AST Chunking passed: extracted ${tsChunks.length} symbols and split oversized methods (${splitChunks.length} chunks)`);

  // -------------------------------------------------------------------
  // 2. Content Hashing & CRLF/LF Normalization
  // -------------------------------------------------------------------
  console.log("\n[Unit 2] Testing Content Hashing & Invariance...");

  const contentLF = "function hello() {\n  return 'world';\n}\n";
  const contentCRLF = "function hello() {\r\n  return 'world';\r\n}\r\n";

  const hashLF = computeContentHash(contentLF);
  const hashCRLF = computeContentHash(contentCRLF);

  assert.strictEqual(hashLF.length, 64, "SHA-256 hash must be 64 hex characters");
  assert.strictEqual(hashLF, hashCRLF, "Normalized content hash must be invariant to CRLF vs LF line endings");

  const expectedHash = crypto.createHash("sha256").update(contentLF).digest("hex");
  assert.strictEqual(hashLF, expectedHash, "Content hash must strictly match SHA-256 digest");

  console.log(`  ✓ Content hashing passed: identical SHA-256 hash across LF and CRLF (${hashLF.substring(0, 16)}...)`);

  // -------------------------------------------------------------------
  // 3. RBAC Hierarchy & Permission Enforcement
  // -------------------------------------------------------------------
  console.log("\n[Unit 3] Testing RBAC Hierarchy & Permission Enforcement...");

  assert.strictEqual(ROLE_HIERARCHY.owner, 40);
  assert.strictEqual(ROLE_HIERARCHY.admin, 30);
  assert.strictEqual(ROLE_HIERARCHY.member, 20);
  assert.strictEqual(ROLE_HIERARCHY.viewer, 10);

  // Seed dev org & memberships for testing
  const orgId = "org-rbac-unit-test";
  orgService.setDevOrg({
    id: orgId,
    name: "RBAC Unit Org",
    slug: "rbac-unit-org",
    createdBy: "owner-user-01",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  orgService.setDevMembership("admin-user-02", orgId, "admin");
  orgService.setDevMembership("viewer-user-03", orgId, "viewer");

  // Case A: Admin performing admin action (requireOrgRole("admin")) -> Allowed
  const adminReq = {
    user: { id: "admin-user-02" },
    params: { orgId },
    headers: {},
  };
  let adminNext = false;
  const adminMiddleware = requireOrgRole("admin");
  await adminMiddleware(adminReq, {}, () => {
    adminNext = true;
  });
  assert.strictEqual(adminNext, true, "Admin must be authorized for admin role requirement");

  // Case B: Viewer attempting admin action (requireOrgRole("admin")) -> Forbidden (403)
  let viewerStatusCode = 200;
  let viewerBody = null;
  const viewerRes = {
    status: (code) => {
      viewerStatusCode = code;
      return {
        json: (b) => {
          viewerBody = b;
        },
      };
    },
  };
  const viewerReq = {
    user: { id: "viewer-user-03" },
    params: { orgId },
    headers: {},
  };
  let viewerNext = false;
  await adminMiddleware(viewerReq, viewerRes, () => {
    viewerNext = true;
  });
  assert.strictEqual(viewerNext, false, "Viewer must NOT be authorized for admin action");
  assert.strictEqual(viewerStatusCode, 403, "Insufficient permission must return HTTP 403");
  assert.strictEqual(viewerBody?.code, "INSUFFICIENT_PERMISSIONS");

  console.log(`  ✓ RBAC permission checks passed: admin allowed, viewer blocked with HTTP 403 INSUFFICIENT_PERMISSIONS`);

  // -------------------------------------------------------------------
  // 4. Prompt Construction & Sandboxing Boundaries
  // -------------------------------------------------------------------
  console.log("\n[Unit 4] Testing Prompt Construction & Sandboxing Boundaries...");
  const promptBuilder = new PromptBuilder();

  const mockChunks = [
    {
      id: "chk-1",
      repositoryId: "repo-1",
      filePath: "src/auth/jwt.ts",
      startLine: 10,
      endLine: 25,
      content: "export function signToken(user: User) { return jwt.sign(user); }",
      symbolName: "signToken",
      chunkType: "function",
    },
    {
      id: "chk-2",
      repositoryId: "repo-1",
      filePath: "src/auth/verify.ts",
      startLine: 40,
      endLine: 60,
      content: "export function verifyToken(token: string) { return jwt.verify(token); }",
      symbolName: "verifyToken",
      chunkType: "function",
    },
  ];

  const formattedBlocks = promptBuilder.formatContextBlocks(mockChunks);
  assert.ok(formattedBlocks.includes("[CTX-1] File: src/auth/jwt.ts (lines 10-25) | Symbol: signToken (function)"));
  assert.ok(formattedBlocks.includes("[CTX-2] File: src/auth/verify.ts (lines 40-60) | Symbol: verifyToken (function)"));

  const fullPrompt = promptBuilder.buildPrompt(
    "How is JWT signing implemented?",
    mockChunks,
    "repo-1",
    "main",
    "repomind/core"
  );

  assert.ok(fullPrompt.systemPrompt.includes("UNTRUSTED DATA BOUNDARY"), "System prompt must declare untrusted data boundary");
  assert.ok(fullPrompt.systemPrompt.includes("STRICT EVIDENCE CITATIONS"), "System prompt must mandate citations");
  assert.ok(fullPrompt.userPrompt.includes("=== BEGIN UNTRUSTED REPOSITORY CONTEXT"), "Must frame context with untrusted opening boundary");
  assert.ok(fullPrompt.userPrompt.includes("=== END UNTRUSTED REPOSITORY CONTEXT ==="), "Must close untrusted boundary");
  assert.strictEqual(fullPrompt.candidateChunks.length, 2);

  console.log(`  ✓ Prompt builder passed: formatted [CTX-1] & [CTX-2] blocks with strict untrusted boundary framing`);

  // -------------------------------------------------------------------
  // 5. Citation Parsing & Hallucination Suppression
  // -------------------------------------------------------------------
  console.log("\n[Unit 5] Testing Citation Parsing & Hallucination Suppression...");
  const validator = new CitationValidator();

  const candidateChunks = [
    {
      chunkId: "chk-1",
      repositoryId: "repo-1",
      filePath: "src/crypto/aes.ts",
      startLine: 12,
      endLine: 35,
      content: "export function encryptData() {}",
      chunkHash: "hash-aes-1",
    },
    {
      chunkId: "chk-2",
      repositoryId: "repo-1",
      filePath: "src/crypto/rsa.ts",
      startLine: 50,
      endLine: 80,
      content: "export function generateKeys() {}",
      chunkHash: "hash-rsa-2",
    },
  ];

  // Case: Model output contains valid citation [CTX-1] and hallucinated citations [CTX-3], [CTX-99]
  const rawModelResponse = `
Encryption is handled with AES-GCM [CTX-1].
RSA key generation is also supported [CTX-2].
We also support Quantum encryption [CTX-3] and Blockchain [CTX-99].
  `.trim();

  const validationResult = validator.validate(rawModelResponse, candidateChunks);

  assert.strictEqual(validationResult.validatedCitations.length, 2, "Should retain exactly 2 valid citations ([CTX-1], [CTX-2])");
  assert.strictEqual(validationResult.validCount, 2, "Should count 2 valid citations");
  assert.strictEqual(validationResult.invalidCount, 2, "Should count 2 invalid citations ([CTX-3], [CTX-99])");

  // Check sanitized text: hallucinated references stripped, valid references preserved
  assert.ok(validationResult.sanitizedResponse.includes("[CTX-1]"));
  assert.ok(validationResult.sanitizedResponse.includes("[CTX-2]"));
  assert.ok(!validationResult.sanitizedResponse.includes("[CTX-3]"), "Hallucinated [CTX-3] must be stripped");
  assert.ok(!validationResult.sanitizedResponse.includes("[CTX-99]"), "Hallucinated [CTX-99] must be stripped");

  console.log(`  ✓ Citation validator passed: sanitized response, preserved [CTX-1, CTX-2], suppressed [CTX-3, CTX-99]`);

  // -------------------------------------------------------------------
  // 6. Webhook Signature Verification (HMAC SHA-256 timingSafeEqual)
  // -------------------------------------------------------------------
  console.log("\n[Unit 6] Testing Webhook Signature Verification (HMAC SHA-256)...");
  const webhookService = new WebhookService();
  const secret = "super-secure-webhook-secret-xyz-123";
  const rawPayload = JSON.stringify({ ref: "refs/heads/main", before: "abc", after: "def" });

  const validHmac = crypto.createHmac("sha256", secret).update(rawPayload).digest("hex");
  const validHeader = `sha256=${validHmac}`;

  // Valid signature
  assert.strictEqual(
    webhookService.verifyGitHubSignature(rawPayload, validHeader, secret),
    true,
    "Valid HMAC SHA-256 signature must be accepted"
  );

  // Invalid signature (tampered body)
  const tamperedPayload = rawPayload + " ";
  assert.strictEqual(
    webhookService.verifyGitHubSignature(tamperedPayload, validHeader, secret),
    false,
    "Tampered body must fail verification"
  );

  // Invalid secret
  assert.strictEqual(
    webhookService.verifyGitHubSignature(rawPayload, validHeader, "wrong-secret"),
    false,
    "Incorrect secret must fail verification"
  );

  // Malformed header
  assert.strictEqual(
    webhookService.verifyGitHubSignature(rawPayload, "md5=12345", secret),
    false,
    "Non-sha256 header must fail verification"
  );

  console.log(`  ✓ Webhook HMAC SHA-256 signature verification passed with timingSafeEqual`);

  console.log("\n=======================================================");
  console.log("  All Phase 14 Unit Tests Passed (6/6 Suites)!");
  console.log("=======================================================\n");
}

runUnitTests().catch((err) => {
  console.error("Unit test failed:", err);
  process.exit(1);
});
