import { chunkService } from "../chunking/chunk.service.js";
import type {
  PullRequestAnalysis,
  PRChangedFile,
  FileNeedingReview,
} from "@repomind/shared-types";

export interface AnalyzePRInput {
  repositoryId: string;
  prNumber: number;
  title: string;
  author: string;
  changedFiles: PRChangedFile[];
  diffDescription?: string;
}

export class PRAnalyzerService {
  /**
   * Analyzes a Pull Request diff against the repository's indexed AST and security boundaries.
   * STRICT INVARIANT: Provides advisory intelligence for human engineers; NEVER auto-approves or merges.
   */
  async analyzePullRequest(input: AnalyzePRInput): Promise<PullRequestAnalysis> {
    const { repositoryId, prNumber, title, author, changedFiles, diffDescription } = input;

    const filesNeedingReview: FileNeedingReview[] = [];
    const affectedSymbols = new Set<string>();
    const suggestedTests = new Set<string>();
    let totalAdditions = 0;
    let totalDeletions = 0;
    let hasSecuritySensitiveChanges = false;
    let hasSchemaChanges = false;
    let hasTestsChanged = false;
    let hasCoreBusinessLogic = false;

    // High-risk patterns in paths or code
    const securityPatterns = [
      /auth/i,
      /vault/i,
      /crypto/i,
      /session/i,
      /token/i,
      /secret/i,
      /permission/i,
      /rbac/i,
      /jwt/i,
    ];
    const schemaPatterns = [/model/i, /schema/i, /migration/i, /database/i];
    const testPatterns = [/\.test\./i, /\.spec\./i, /__tests__/i, /test-/i];

    for (const file of changedFiles) {
      totalAdditions += file.additions;
      totalDeletions += file.deletions;

      const filename = file.filename;

      if (testPatterns.some((p) => p.test(filename))) {
        hasTestsChanged = true;
      }

      // 1. Security check
      if (securityPatterns.some((p) => p.test(filename))) {
        hasSecuritySensitiveChanges = true;
        filesNeedingReview.push({
          file: filename,
          priority: "high",
          reason: "Modifies authentication, encryption, or security-sensitive authorization boundaries.",
        });
      }
      // 2. Schema check
      else if (schemaPatterns.some((p) => p.test(filename))) {
        hasSchemaChanges = true;
        filesNeedingReview.push({
          file: filename,
          priority: "high",
          reason: "Modifies database schema or data model persistence structure. Check backward compatibility.",
        });
      }
      // 3. Large changes check
      else if (file.additions + file.deletions > 250) {
        hasCoreBusinessLogic = true;
        filesNeedingReview.push({
          file: filename,
          priority: "medium",
          reason: `High code churn (${file.additions + file.deletions} lines modified). Potential unintended side-effects.`,
        });
      }
      // 4. Regular service or controller check
      else if (filename.includes("service") || filename.includes("controller") || filename.includes("router")) {
        hasCoreBusinessLogic = true;
        filesNeedingReview.push({
          file: filename,
          priority: "medium",
          reason: "Modifies business logic or HTTP routing surface.",
        });
      }

      // Extract affected symbols from patch or existing chunks
      if (file.patch) {
        const symbolMatches = file.patch.match(/(?:function|class|const|interface|type)\s+([A-Za-z0-9_]+)/g);
        if (symbolMatches) {
          for (const m of symbolMatches) {
            const sym = m.split(/\s+/)[1];
            if (sym && sym.length > 2) affectedSymbols.add(sym);
          }
        }
      }

      // Match against indexed chunks in this repository
      const repoChunks = await chunkService.getRepoChunks(repositoryId);
      const fileChunks = repoChunks.filter((c) => c.header?.path === filename);
      for (const fc of fileChunks) {
        if (fc.symbolName) {
          affectedSymbols.add(fc.symbolName);
        }
      }

      // Derive suggested tests
      const baseName = filename.replace(/\.[^/.]+$/, "").replace(/^src\//, "");
      suggestedTests.add(`npm test -- --grep="${baseName}"`);
    }

    // Determine Risk Level & Score
    let riskLevel: "low" | "medium" | "high" = "low";
    let riskScore = 10;
    let riskJustification = "Low risk change consisting of localized modifications, documentation, or tests.";

    if (hasSecuritySensitiveChanges || hasSchemaChanges) {
      riskLevel = "high";
      riskScore = 85;
      riskJustification =
        "CRITICAL: Touches security, encryption vault, token handling, or persistent database models. Requires multi-peer senior review.";
    } else if (hasCoreBusinessLogic && !hasTestsChanged) {
      riskLevel = "medium";
      riskScore = 55;
      riskJustification =
        "ATTENTION: Modifies business logic or services without accompanying test updates. Potential regression risk.";
    } else if (totalAdditions + totalDeletions > 400) {
      riskLevel = "medium";
      riskScore = 50;
      riskJustification = "Moderate risk due to substantial code volume changed across repository.";
    }

    // Standardized Review Checklist for human reviewers
    const reviewChecklist = [
      hasSecuritySensitiveChanges
        ? "Verify cryptographic initialization vectors (IV), secret key zeroing, and timingSafeEqual checks."
        : "Verify input validation and null checks on all new parameters.",
      hasSchemaChanges
        ? "Verify backward compatibility with existing stored documents; verify migration strategy."
        : "Verify error handling and meaningful HTTP status codes.",
      !hasTestsChanged
        ? "FLAG: No test files were modified in this PR. Request unit or integration test additions from author."
        : "Verify new tests cover boundary conditions and failure paths.",
      "Inspect performance implications and database query index usage.",
      "Verify that no secrets, tokens, or environment credentials are inadvertently hardcoded.",
    ];

    if (suggestedTests.size === 0) {
      suggestedTests.add("npm test");
    }

    const diffSummary =
      diffDescription ||
      `PR #${prNumber} by @${author} updates ${changedFiles.length} files (+${totalAdditions}, -${totalDeletions}). Impacted symbols: ${Array.from(affectedSymbols).slice(0, 5).join(", ") || "none detected"}.`;

    return {
      repositoryId,
      prNumber,
      title,
      author,
      riskLevel,
      riskScore,
      riskJustification,
      diffSummary,
      changedFiles,
      affectedSymbols: Array.from(affectedSymbols),
      filesNeedingHumanReview: filesNeedingReview,
      reviewChecklist,
      suggestedTests: Array.from(suggestedTests),
      humanReviewOnlyNotice:
        "RepoMind PR Analyzer provides advisory guidance for engineering teams. It never auto-approves or auto-merges pull requests.",
      analyzedAt: new Date().toISOString(),
    };
  }
}

export const prAnalyzerService = new PRAnalyzerService();
