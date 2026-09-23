// apps/api/test-ast-chunking.mjs
// Comprehensive test for Phase 6 AST Code Chunking

import { chunkCodeFile, formatContextualHeader } from "./dist/modules/chunking/parsers/ast-chunker.js";
import { chunkService } from "./dist/modules/chunking/chunk.service.js";

console.log("=================================================");
console.log("       REPOMIND PHASE 6: AST CHUNKING TEST       ");
console.log("=================================================");

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

// 1. Test TypeScript AST Chunking
console.log("\n[1] Testing TypeScript / JavaScript AST Chunking...");

const sampleTsCode = `// User service file
import { db } from './db';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  private repoName: string;

  constructor(repoName: string) {
    this.repoName = repoName;
  }

  public async getUser(userId: string): Promise<UserProfile> {
    const user = await db.find(userId);
    return user;
  }

  public validateEmail(email: string): boolean {
    return email.includes('@');
  }
}

export function calculateReputation(score: number): string {
  if (score > 100) return 'Expert';
  return 'Novice';
}
`;

const tsChunks = chunkCodeFile(
  "acme/repomind-core",
  "src/services/user.service.ts",
  "typescript",
  sampleTsCode
);

console.log(`Generated ${tsChunks.length} chunks from TypeScript source.`);
for (const ch of tsChunks) {
  console.log(`  - [${ch.chunkType}] ${ch.symbolName} (lines ${ch.startLine}-${ch.endLine}) [${ch.contentHash.substring(0, 8)}]`);
}

assert(tsChunks.length >= 3, `Expected at least 3 AST chunks, got ${tsChunks.length}`);

// Verify interface chunk
const interfaceChunk = tsChunks.find((c) => c.symbolName === "UserProfile");
assert(!!interfaceChunk, "Found UserProfile interface chunk");
assert(interfaceChunk?.chunkType === "interface", "UserProfile has chunkType 'interface'");
const formattedHeader = formatContextualHeader(interfaceChunk?.header);
assert(formattedHeader.includes("Symbol: UserProfile (interface)"), "Contextual header contains symbol info");

// Verify class / method chunks
const methodChunk = tsChunks.find((c) => c.symbolName === "UserService.getUser" || c.symbolName === "UserService");
assert(!!methodChunk, "Found UserService class or method chunk");

// Verify function chunk
const fnChunk = tsChunks.find((c) => c.symbolName === "calculateReputation");
assert(!!fnChunk, "Found calculateReputation function chunk");
assert(fnChunk?.startLine && fnChunk?.endLine >= fnChunk?.startLine, "Line bounds are strictly valid");
assert(fnChunk?.contentHash && fnChunk?.contentHash.length === 64, "SHA-256 chunk hash is 64 hex characters");

// 2. Test Python AST / Block Chunking
console.log("\n[2] Testing Python AST Chunking...");

const samplePyCode = `import os
import sys

class RepositoryScanner:
    def __init__(self, root_dir: str):
        self.root_dir = root_dir

    def scan_directory(self):
        found_files = []
        for root, dirs, files in os.walk(self.root_dir):
            for file in files:
                found_files.append(os.path.join(root, file))
        return found_files

def format_report(summary: dict) -> str:
    lines = [f"{k}: {v}" for k, v in summary.items()]
    return "\\n".join(lines)
`;

const pyChunks = chunkCodeFile(
  "acme/scanner",
  "scanner/main.py",
  "python",
  samplePyCode
);

console.log(`Generated ${pyChunks.length} chunks from Python source.`);
for (const ch of pyChunks) {
  console.log(`  - [${ch.chunkType}] ${ch.symbolName} (lines ${ch.startLine}-${ch.endLine}) [${ch.contentHash.substring(0, 8)}]`);
}

assert(pyChunks.length >= 2, `Expected at least 2 Python chunks, got ${pyChunks.length}`);
const pyClassChunk = pyChunks.find((c) => c.symbolName?.includes("RepositoryScanner"));
assert(!!pyClassChunk, "Found RepositoryScanner class or method chunk in Python");
const pyFnChunk = pyChunks.find((c) => c.symbolName === "format_report");
assert(!!pyFnChunk, "Found format_report function chunk in Python");

// 3. Test Oversized Symbol Splitting (> 60 lines)
console.log("\n[3] Testing Oversized Symbol Splitting...");

let longMethodBody = "";
for (let i = 1; i <= 140; i++) {
  longMethodBody += `    console.log("Processing item #${i} in batch processing run");\n`;
}

const oversizedCode = `export class MassiveProcessor {
  public async processAll(): Promise<void> {
${longMethodBody}  }
}
`;

const splitChunks = chunkCodeFile(
  "acme/repomind-core",
  "src/workers/processor.ts",
  "typescript",
  oversizedCode
);

console.log(`Generated ${splitChunks.length} chunks from 140+ line method.`);
for (const ch of splitChunks) {
  console.log(`  - [${ch.chunkType}] ${ch.symbolName} (lines ${ch.startLine}-${ch.endLine})`);
}

assert(splitChunks.length > 1, `Oversized symbol (>60 lines) was split into multiple chunks (got ${splitChunks.length})`);
assert(splitChunks.every((c) => c.symbolName?.includes("MassiveProcessor")), "All split sub-chunks preserved parent symbol hierarchy");

// 4. Test ChunkService integration
console.log("\n[4] Testing ChunkService file processing and dev storage...");

const testRepo = {
  id: "repo_ast_test_999",
  organizationId: "org_1",
  name: "acme/repomind-core",
  description: "Test repo",
  defaultBranch: "main",
  indexStatus: "completed",
  indexVersion: 1,
  indexedFilesCount: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const testFile = {
  id: "file_ast_123",
  repositoryId: testRepo.id,
  path: "src/sample.ts",
  language: "typescript",
  contentHash: "hash_xyz_123",
  size: 500,
  content: sampleTsCode,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const savedChunks = await chunkService.processFileChunks(testRepo, testFile);
assert(savedChunks.length > 0, `ChunkService stored ${savedChunks.length} chunks`);

const retrievedChunks = await chunkService.getRepoChunks(testRepo.id);
assert(retrievedChunks.length === savedChunks.length, `Retrieved ${retrievedChunks.length} chunks by repoId`);
assert(retrievedChunks[0].repositoryId === testRepo.id, "Chunks correctly tagged with repositoryId");

console.log("\n=================================================");
console.log(`TEST RUN COMPLETE: ${testsPassed}/${testsTotal} passed.`);
console.log("=================================================");
