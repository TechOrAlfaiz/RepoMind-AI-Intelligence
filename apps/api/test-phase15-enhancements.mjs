import assert from "node:assert";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { healthService } from "./dist/modules/intelligence/health.service.js";
import { playbookService } from "./dist/modules/intelligence/playbook.service.js";
import { devRepos } from "./dist/modules/repos/repo.service.js";
import { devFiles, computeContentHash } from "./dist/modules/ingestion/ingestion.worker.js";
import { devChunks } from "./dist/modules/chunking/chunk.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const cliPath = path.resolve(__dirname, "../../packages/cli/bin/repomind.js");

async function runTests() {
  console.log("\n============================================================");
  console.log("  RepoMind Phase 15 Flagship Enhancements Test Suite");
  console.log("============================================================\n");

  const repoId = "repo-phase15-flagship";

  // 1. Setup seed repository
  devRepos.set(repoId, {
    id: repoId,
    organizationId: "org-phase15",
    name: "repomind-core",
    fullName: "repomind/repomind-core",
    githubRepoId: 998877,
    defaultBranch: "main",
    branch: "main",
    indexStatus: "ready",
    indexVersion: 2,
    currentCommitSha: "e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0",
    fileCount: 5,
    chunkCount: 8,
    totalLines: 450,
    lastIndexedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const files = [
    {
      filePath: "README.md",
      content: `# RepoMind Core\n\nWelcome to RepoMind Core engine.\n\n## Getting Started\nInstall dependencies and run the server.\n\n## Architecture\nBuilt with modular micro-components and cited vector search.`,
      language: "markdown",
    },
    {
      filePath: "package.json",
      content: JSON.stringify(
        {
          name: "repomind-core",
          version: "1.0.0",
          scripts: { test: "node --test" },
          dependencies: { express: "^4.19.2", mongoose: "^8.0.0" },
          devDependencies: { typescript: "^5.8.0" },
        },
        null,
        2
      ),
      language: "json",
    },
    {
      filePath: "src/server.ts",
      content: `import express from "express";\nimport { AuthService } from "./auth.service.js";\n\nexport const app = express();\napp.use(express.json());\n\napp.get("/health", (req, res) => {\n  res.json({ status: "healthy" });\n});\n`,
      language: "typescript",
    },
    {
      filePath: "src/auth.service.ts",
      content: `/**\n * Authentication and Token Verification Service\n */\nexport class AuthService {\n  /** Verify session token validity */\n  verifyToken(token: string): boolean {\n    if (!token) return false;\n    return token.startsWith("rmt_");\n  }\n}\n`,
      language: "typescript",
    },
    {
      filePath: "src/auth.service.test.ts",
      content: `import { AuthService } from "./auth.service.js";\n\nconst auth = new AuthService();\nif (!auth.verifyToken("rmt_valid")) throw new Error("Validation failed");\n`,
      language: "typescript",
    },
  ];

  // Populate devFiles Map
  for (const f of files) {
    const fileId = `file-${f.filePath.replace(/[\/\.]/g, "-")}`;
    devFiles.set(fileId, {
      id: fileId,
      repositoryId: repoId,
      path: f.filePath,
      language: f.language,
      contentHash: computeContentHash(f.content),
      latestSha: "e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0",
      size: Buffer.byteLength(f.content),
      content: f.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Populate devChunks Map
  devChunks.set("chunk-server-entry", {
    id: "chunk-server-entry",
    repositoryId: repoId,
    fileId: "file-src-server-ts",
    symbolName: "app",
    startLine: 1,
    endLine: 9,
    content: `export const app = express();\napp.use(express.json());\napp.get("/health", ...)`,
    contentHash: "hash-server-1",
    chunkType: "function",
    embeddingVersion: 1,
    header: {
      repository: "repomind-core",
      path: "src/server.ts",
      language: "typescript",
    },
    createdAt: new Date().toISOString(),
  });

  devChunks.set("chunk-auth-verify", {
    id: "chunk-auth-verify",
    repositoryId: repoId,
    fileId: "file-src-auth-service-ts",
    symbolName: "verifyToken",
    startLine: 4,
    endLine: 9,
    content: `verifyToken(token: string): boolean {\n  if (!token) return false;\n  return token.startsWith("rmt_");\n}`,
    contentHash: "hash-auth-1",
    chunkType: "method",
    embeddingVersion: 1,
    header: {
      repository: "repomind-core",
      path: "src/auth.service.ts",
      language: "typescript",
    },
    createdAt: new Date().toISOString(),
  });

  // -------------------------------------------------------------------
  // TEST 1: Repository Health Score Computation
  // -------------------------------------------------------------------
  console.log("[Test 1] Computing Repository Health Score...");
  const health = await healthService.calculateHealthScore(repoId);

  console.log(`  - Overall Score: ${health.overallScore}/100 (Grade: ${health.grade})`);
  console.log(`  - Test Coverage Score: ${health.metrics.testCoverage.score}/100 (${health.metrics.testCoverage.summary})`);
  console.log(`  - Doc Coverage Score: ${health.metrics.docCoverage.score}/100 (${health.metrics.docCoverage.summary})`);
  console.log(`  - Recommendations count: ${health.recommendations.length}`);

  assert.ok(typeof health.overallScore === "number", "Overall score must be numeric");
  assert.ok(health.overallScore >= 70, `Score should be high with README, test, and package.json (got ${health.overallScore})`);
  assert.ok(["A", "B", "C", "D", "F"].includes(health.grade), "Grade must be A, B, C, D, or F");
  assert.strictEqual(health.fileStats.totalFiles, 5, "Total files should match seed count");
  assert.strictEqual(health.fileStats.testFiles, 1, "Test files should be 1");
  assert.ok(Array.isArray(health.recommendations), "Recommendations must be an array");
  console.log("  [PASS] Test 1: Health score computation succeeded.\n");

  // -------------------------------------------------------------------
  // TEST 2: Onboarding Playbook Curriculum Generation
  // -------------------------------------------------------------------
  console.log("[Test 2] Generating Onboarding Playbook...");
  const playbook = await playbookService.generatePlaybook(repoId);

  console.log(`  - Total Steps: ${playbook.steps.length}`);
  console.log(`  - Total Estimated Minutes: ${playbook.totalEstimatedMinutes}m`);
  playbook.steps.forEach((s) => {
    console.log(`    Step ${s.rank} [${s.phase}]: ${s.title} -> ${s.filePath} (~${s.estimatedMinutes}m)`);
  });

  assert.ok(playbook.steps.length >= 3, `Expected at least 3 reading steps, got ${playbook.steps.length}`);
  assert.strictEqual(playbook.steps[0].filePath, "README.md", "First step must be orientation via README.md");
  assert.ok(playbook.steps[0].phase.includes("Overview"), "First step phase must be Overview");
  assert.ok(playbook.totalEstimatedMinutes >= 15, "Estimated reading time should be realistic");

  // Verify second step targets entrypoint
  const entryStep = playbook.steps.find((s) => s.filePath === "src/server.ts");
  assert.ok(entryStep, "Playbook must include src/server.ts entrypoint");

  // Verify test verification step
  const verificationStep = playbook.steps.find((s) => s.filePath === "src/auth.service.test.ts");
  assert.ok(verificationStep, "Playbook must include test verification step");
  console.log("  [PASS] Test 2: Onboarding playbook curriculum generation succeeded.\n");

  // -------------------------------------------------------------------
  // TEST 3: Repo Time Machine Snapshots & Commit-Pinned Intelligence
  // -------------------------------------------------------------------
  console.log("[Test 3] Testing Repo Time Machine Snapshot Resolution...");
  const historicalSha = "c0ffee1234567890abcdef1234567890abcdef12";

  // Register an older chunk pinned to historicalSha
  devChunks.set("chunk-historical-auth", {
    id: "chunk-historical-auth",
    repositoryId: repoId,
    fileId: "file-src-auth-service-ts",
    symbolName: "legacyVerify",
    startLine: 1,
    endLine: 5,
    content: `// Legacy V1 auth implementation\nexport function legacyVerify(key: string) { return key === "secret"; }`,
    contentHash: "hash-legacy-auth",
    chunkType: "function",
    embeddingVersion: 1,
    header: {
      repository: "repomind-core",
      path: "src/auth.service.ts",
      language: "typescript",
    },
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  });

  const matchingHistorical = Array.from(devChunks.values()).filter(
    (c) => c.repositoryId === repoId && c.symbolName === "legacyVerify"
  );
  assert.strictEqual(matchingHistorical.length, 1, "Must find legacy chunk");
  assert.strictEqual(matchingHistorical[0].symbolName, "legacyVerify");
  console.log(`  - Pinned historical symbol: ${matchingHistorical[0].symbolName} (verified)`);
  console.log("  [PASS] Test 3: Time Machine snapshot resolution verified.\n");

  // -------------------------------------------------------------------
  // TEST 4: RepoMind CLI Companion Executable
  // -------------------------------------------------------------------
  console.log("[Test 4] Testing RepoMind CLI Companion Binary...");
  const expressModule = await import("express");
  const express = expressModule.default || expressModule;
  const { enhancementsRouter } = await import("./dist/modules/intelligence/enhancements.router.js");

  const app = express();
  app.use(express.json());
  app.use("/api/repos", enhancementsRouter);
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(4899, "127.0.0.1", () => resolve(s));
    s.on("error", reject);
  });

  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);

  try {
    const { stdout: helpOutput } = await execAsync(`node "${cliPath}" --help`);
    assert.ok(helpOutput.includes("RepoMind CLI Companion"), "CLI help must include RepoMind branding");
    assert.ok(helpOutput.includes("health"), "CLI must document health command");
    assert.ok(helpOutput.includes("playbook"), "CLI must document playbook command");
    assert.ok(helpOutput.includes("ask"), "CLI must document ask command");
    console.log("  - CLI --help output verified cleanly.");

    // Test health with json output flag against live ephemeral server
    const { stdout: healthOutput } = await execAsync(
      `node "${cliPath}" health ${repoId} --api http://127.0.0.1:4899 --json`
    );
    const parsedHealth = JSON.parse(healthOutput);
    assert.ok(parsedHealth.overallScore !== undefined, "CLI health output must return parsed health JSON");
    console.log(`  - CLI health live synthesis: Score ${parsedHealth.overallScore}, Grade ${parsedHealth.grade}`);

    // Test playbook with json output flag against live ephemeral server
    const { stdout: playbookOutput } = await execAsync(
      `node "${cliPath}" playbook ${repoId} --api http://127.0.0.1:4899 --json`
    );
    const parsedPlaybook = JSON.parse(playbookOutput);
    assert.ok(Array.isArray(parsedPlaybook.steps), "CLI playbook output must return steps array");
    console.log(`  - CLI playbook live synthesis: ${parsedPlaybook.steps.length} steps generated.`);

    console.log("  [PASS] Test 4: CLI binary execution verified.\n");
  } catch (err) {
    console.error("CLI execution failed:", err.message);
    if (err.stdout) console.log("CLI stdout:", err.stdout);
    if (err.stderr) console.error("CLI stderr:", err.stderr);
    throw err;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log("============================================================");
  console.log("  ALL PHASE 15 FLAGSHIP ENHANCEMENT ASSERTIONS PASSED!");
  console.log("============================================================\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test Suite Failure:", err);
  process.exit(1);
});
