import { getRepoFiles } from "../ingestion/ingestion.worker.js";
import { chunkService } from "../chunking/chunk.service.js";
import { repoService } from "../repos/repo.service.js";
import type { OnboardingPlaybook, OnboardingStep } from "@repomind/shared-types";

export class PlaybookService {
  /**
   * Generates a curated, ranked onboarding reading list for newly joined engineers.
   * Orders files from architectural entry point down to services and tests.
   */
  async generatePlaybook(repoId: string): Promise<OnboardingPlaybook> {
    const repo = await repoService.getRepoById(repoId);
    if (!repo) {
      throw new Error(`Repository ${repoId} not found`);
    }

    const files = await getRepoFiles(repoId);
    const chunks = await chunkService.getRepoChunks(repoId);

    const steps: OnboardingStep[] = [];
    let rank = 1;

    // Helper to find chunks by file path
    const getFileChunks = (filePath: string) =>
      chunks.filter((c: any) => (c.header?.path === filePath || c.filePath === filePath));

    // 1. Documentation & Architecture
    const readmeFile = files.find((f) => f.path.toLowerCase() === "readme.md");
    if (readmeFile) {
      steps.push({
        rank: rank++,
        phase: "Phase 1: High-Level Overview",
        title: "Repository Architecture & Mission",
        filePath: readmeFile.path,
        readingGoal: "Understand the core business problem, technology stack, and high-level architectural design.",
        estimatedMinutes: 8,
        importance: "essential",
        snippet: (readmeFile.content || "").substring(0, 200).trim(),
      });
    }

    // 2. System Entrypoint & Bootstrapping
    const entryFile = files.find((f) => {
      const p = f.path.toLowerCase();
      return p.endsWith("server.ts") || p.endsWith("index.ts") || p.endsWith("main.ts") || p.endsWith("app.ts");
    });
    if (entryFile) {
      const entryChunks = getFileChunks(entryFile.path);
      const topChunk = entryChunks[0];
      steps.push({
        rank: rank++,
        phase: "Phase 2: Execution Entrypoint",
        title: "Application Bootstrapping & Lifecycles",
        filePath: entryFile.path,
        symbolName: topChunk?.symbolName || "bootstrap",
        startLine: topChunk?.startLine || 1,
        endLine: topChunk?.endLine || 25,
        readingGoal: "Trace server initialization, middleware pipeline configuration, and environment setup.",
        estimatedMinutes: 12,
        importance: "essential",
        snippet: topChunk?.content.substring(0, 200).trim(),
      });
    }

    // 3. Domain Models & Type Definitions
    const modelFiles = files.filter((f) => {
      const p = f.path.toLowerCase();
      return p.includes("model.") || p.includes("schema.") || p.endsWith("types.ts") || p.includes("/models/");
    });
    for (const mf of modelFiles.slice(0, 2)) {
      const mChunks = getFileChunks(mf.path);
      const topChunk = mChunks[0];
      steps.push({
        rank: rank++,
        phase: "Phase 3: Domain Models & Entities",
        title: `Entity Definition: ${mf.path.split("/").pop()}`,
        filePath: mf.path,
        symbolName: topChunk?.symbolName,
        startLine: topChunk?.startLine,
        endLine: topChunk?.endLine,
        readingGoal: "Inspect persistent domain schema properties, relationships, and validation constraints.",
        estimatedMinutes: 10,
        importance: "essential",
        snippet: topChunk?.content.substring(0, 180).trim(),
      });
    }

    // 4. Core Business Logic Services
    const serviceFiles = files.filter((f) => {
      const p = f.path.toLowerCase();
      return p.includes("service.") || p.includes("/services/") || p.includes("worker.");
    });
    for (const sf of serviceFiles.slice(0, 3)) {
      const sChunks = getFileChunks(sf.path);
      const topChunk = sChunks[0];
      steps.push({
        rank: rank++,
        phase: "Phase 4: Core Domain Services",
        title: `Business Logic: ${sf.path.split("/").pop()}`,
        filePath: sf.path,
        symbolName: topChunk?.symbolName,
        startLine: topChunk?.startLine,
        endLine: topChunk?.endLine,
        readingGoal: "Understand core state transformations, third-party integrations, and error handling patterns.",
        estimatedMinutes: 15,
        importance: "essential",
        snippet: topChunk?.content.substring(0, 200).trim(),
      });
    }

    // 5. Testing & Quality Verification
    const testFile = files.find((f) => {
      const p = f.path.toLowerCase();
      return p.includes(".test.") || p.includes(".spec.") || p.includes("test-");
    });
    if (testFile) {
      steps.push({
        rank: rank++,
        phase: "Phase 5: Test Harness & Assertions",
        title: "Automated Testing & Integration Assertions",
        filePath: testFile.path,
        readingGoal: "Review automated test assertions to understand expected system invariants and edge case behaviors.",
        estimatedMinutes: 10,
        importance: "recommended",
        snippet: (testFile.content || "").substring(0, 180).trim(),
      });
    }

    const totalEstimatedMinutes = steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);

    return {
      repositoryId: repo.id,
      repositoryName: repo.name,
      targetRole: "Full-Stack Software Engineer",
      generatedAt: new Date().toISOString(),
      totalEstimatedMinutes,
      steps,
      summary: `A structured ${steps.length}-step curriculum (${totalEstimatedMinutes} mins total reading time) to ramp up on ${repo.name} from architecture down to test invariants.`,
    };
  }
}

export const playbookService = new PlaybookService();
