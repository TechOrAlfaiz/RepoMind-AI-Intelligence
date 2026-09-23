// apps/api/test-file-content.mjs
// Automated verification for Phase 9: Monaco Editor Code Viewer & File Content API

import { getFileByPath, devFiles } from "./dist/modules/ingestion/ingestion.worker.js";
import { devRepos } from "./dist/modules/repos/repo.service.js";
import { repoController } from "./dist/modules/repos/repo.controller.js";

console.log("=========================================================");
console.log("    REPOMIND PHASE 9: MONACO FILE CONTENT API TEST       ");
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

// 1. Seed devRepos and devFiles with sample test files
const repoId1 = "repo-monaco-test-alpha";
const repoId2 = "repo-monaco-test-beta";

devRepos.set(repoId1, {
  id: repoId1,
  organizationId: "org-test",
  name: "monaco-test-alpha",
  fullName: "acme/monaco-test-alpha",
  defaultBranch: "main",
  currentCommitSha: "sha-alpha-9999",
  status: "completed",
  indexProgress: 100,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

devRepos.set(repoId2, {
  id: repoId2,
  organizationId: "org-test",
  name: "monaco-test-beta",
  fullName: "acme/monaco-test-beta",
  defaultBranch: "main",
  currentCommitSha: "sha-beta-8888",
  status: "completed",
  indexProgress: 100,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const file1Path = "src/auth/vault.ts";
const file1Content = `import crypto from "crypto";

export function encryptVaultToken(plainText: string, secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secret, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return \`\${iv.toString("hex")}:\${encrypted.toString("hex")}:\${tag.toString("hex")}\`;
}
`;

const file2Path = "services/worker.py";
const file2Content = `import time

def process_job(job_id: str):
    print(f"Processing job {job_id}")
    time.sleep(1)
    return True
`;

devFiles.set(`${repoId1}:${file1Path}`, {
  id: "file_alpha_1",
  repositoryId: repoId1,
  path: file1Path,
  content: file1Content,
  contentHash: "hash123",
  latestSha: "sha-alpha-9999",
  language: "typescript",
  size: file1Content.length,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

devFiles.set(`${repoId2}:${file2Path}`, {
  id: "file_beta_1",
  repositoryId: repoId2,
  path: file2Path,
  content: file2Content,
  contentHash: "hash456",
  latestSha: "sha-beta-8888",
  language: "python",
  size: file2Content.length,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// 2. Test getFileByPath worker helper
console.log("\n[1] Testing getFileByPath direct retrieval...");
const fetched1 = await getFileByPath(repoId1, file1Path);
assert(fetched1 !== null, "Successfully retrieved file1 by repository ID and path");
assert(fetched1?.path === file1Path, `Path matches expected: ${fetched1?.path}`);
assert(fetched1?.language === "typescript", `Language detected correctly: ${fetched1?.language}`);
assert(fetched1?.latestSha === "sha-alpha-9999", `Commit SHA retrieved: ${fetched1?.latestSha}`);
assert(fetched1?.content.includes("encryptVaultToken"), "Content contains expected TypeScript function");

// 3. Test Cross-Tenant Isolation
console.log("\n[2] Testing Strict Repository Scoping...");
const leakTest = await getFileByPath(repoId2, file1Path);
assert(leakTest === null, "File from Repo 1 is NOT accessible using Repo 2 ID (zero tenant leakage)");

const nonExistent = await getFileByPath(repoId1, "does/not/exist.ts");
assert(nonExistent === null, "Non-existent file path returns null");

// 4. Test Controller Handler (Mocking Express Req/Res)
console.log("\n[3] Testing getFileContent Express Controller...");

function createMockReqRes(params, query) {
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
    query,
  };
  return {
    req,
    res,
    getStatus: () => statusCode,
    getBody: () => jsonBody,
  };
}

// 4a: Missing path query parameter -> 400 Bad Request
const missingPathMock = createMockReqRes({ repoId: repoId1 }, {});
await repoController.getFileContent(missingPathMock.req, missingPathMock.res);
assert(missingPathMock.getStatus() === 400, "Returns 400 when ?path= query param is missing");
assert(missingPathMock.getBody()?.error?.includes("Missing"), "Error message indicates missing path parameter");

// 4b: File not found -> 404 Not Found
const notFoundMock = createMockReqRes({ repoId: repoId1 }, { path: "unknown/path.ts" });
await repoController.getFileContent(notFoundMock.req, notFoundMock.res);
assert(notFoundMock.getStatus() === 404, "Returns 404 when file is not found");

// 4c: Successful retrieval -> 200 OK with payload
const successMock = createMockReqRes({ repoId: repoId1 }, { path: file1Path });
await repoController.getFileContent(successMock.req, successMock.res);
assert(successMock.getStatus() === 200, "Returns 200 for valid repo and file path");
const body = successMock.getBody();
assert(body?.path === file1Path, `Response path matches: ${body?.path}`);
assert(body?.language === "typescript", `Response language is typescript: ${body?.language}`);
assert(body?.content === file1Content, "Response content matches exact seeded source code");
assert(body?.commitSha === "sha-alpha-9999", "Response commitSha included");

// 4d: Python file retrieval & language detection
const pyMock = createMockReqRes({ repoId: repoId2 }, { path: file2Path });
await repoController.getFileContent(pyMock.req, pyMock.res);
assert(pyMock.getStatus() === 200, "Returns 200 for Python file");
assert(pyMock.getBody()?.language === "python", "Response language is python");

console.log(`\n=========================================================`);
console.log(`    PHASE 9 TEST SUMMARY: ${testsPassed} / ${testsTotal} PASSED`);
console.log(`=========================================================\n`);

if (testsPassed !== testsTotal) {
  process.exit(1);
}
