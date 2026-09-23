import type { ChangePlanResult, ChangePlanStep, GraphNode } from "@repomind/shared-types";
import { architectureGraphService } from "./graph.service.js";

export class ChangePlannerService {
  /**
   * Generates a grounded, multi-phase architectural change plan based on deterministic codebase mapping.
   */
  public async planChange(
    repositoryId: string,
    prompt: string,
    targetEntities: string[] = [],
  ): Promise<ChangePlanResult> {
    const graph = await architectureGraphService.buildArchitectureGraph(repositoryId);
    const nodes = graph.nodes;

    const lowerPrompt = prompt.toLowerCase();

    // Group existing nodes by architectural layer
    const models = nodes.filter((n) => n.type === "model").map((n) => n.path);
    const services = nodes.filter((n) => n.type === "service").map((n) => n.path);
    const controllers = nodes.filter((n) => n.type === "controller").map((n) => n.path);
    const apis = nodes.filter((n) => n.type === "router" || n.type === "endpoint").map((n) => n.path);
    const views = nodes.filter((n) => n.type === "component" || n.type === "view").map((n) => n.path);
    const tests = nodes.filter((n) => n.isTest || n.type === "test").map((n) => n.path);

    // Identify target files based on keywords or explicit targets
    const matchedFiles = new Set<string>(targetEntities);
    const keywords = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !["with", "from", "into", "this", "that", "replace", "update", "migrate", "change"].includes(w));

    for (const node of nodes) {
      const match = keywords.some((kw) => node.path.toLowerCase().includes(kw) || node.name.toLowerCase().includes(kw));
      if (match) {
        matchedFiles.add(node.path);
      }
    }

    const filesToModify: string[] = Array.from(matchedFiles);
    if (filesToModify.length === 0) {
      // Pick representative files by domain
      if (lowerPrompt.includes("database") || lowerPrompt.includes("mongo") || lowerPrompt.includes("postgres") || lowerPrompt.includes("sql")) {
        filesToModify.push(...models);
      } else if (lowerPrompt.includes("auth") || lowerPrompt.includes("token") || lowerPrompt.includes("login")) {
        filesToModify.push(...services.filter((s) => s.includes("auth")));
      } else {
        filesToModify.push(...services.slice(0, 3));
      }
    }

    // Downstream files needing review (dependents)
    const filesToReview: string[] = [];
    for (const modFile of filesToModify) {
      const modNode = nodes.find((n) => n.path === modFile);
      if (modNode) {
        const directDeps = graph.edges.filter((e) => e.target === modNode.id).map((e) => nodes.find((n) => n.id === e.source)?.path).filter(Boolean) as string[];
        filesToReview.push(...directDeps);
      }
    }
    const uniqueReview = Array.from(new Set(filesToReview)).filter((f) => !filesToModify.includes(f));

    // Tests needing update
    const testsToUpdate: string[] = [];
    for (const testPath of tests) {
      const testNode = nodes.find((n) => n.path === testPath);
      if (testNode) {
        const testsTarget = graph.edges.some((e) => e.source === testNode.id && filesToModify.some((m) => nodes.find((n) => n.id === e.target)?.path === m));
        if (testsTarget) {
          testsToUpdate.push(testPath);
        }
      }
    }
    if (testsToUpdate.length === 0 && tests.length > 0) {
      testsToUpdate.push(...tests.slice(0, 2));
    }

    // Build structured migration steps
    const migrationSteps: ChangePlanStep[] = [
      {
        phase: "Phase 1: Foundation & Interface Contracts",
        title: "Define New Schemas and Abstractions",
        description: `Define target interfaces and types for the planned change: "${prompt}". Ensure backwards compatibility during transition.`,
        affectedFiles: filesToModify.slice(0, 3),
        riskLevel: "medium",
        actionRequired: "Introduce interface abstractions before changing underlying implementation",
      },
      {
        phase: "Phase 2: Core Domain Logic Migration",
        title: "Update Business Services and Data Access",
        description: `Refactor core logic in affected services to use the updated contracts. Update connection pools and transaction boundaries.`,
        affectedFiles: filesToModify,
        riskLevel: "high",
        actionRequired: "Refactor core routines; run local isolation tests after each file modification",
      },
      {
        phase: "Phase 3: Controller & Endpoint Adaptation",
        title: "Update Routing Layer & Contract Validation",
        description: `Adapt API controllers and route handlers to serialize and validate data according to the updated contracts.`,
        affectedFiles: uniqueReview.filter((f) => f.includes("controller") || f.includes("router") || f.includes("api")).slice(0, 4),
        riskLevel: "medium",
        actionRequired: "Verify REST payload contracts against frontend schemas",
      },
      {
        phase: "Phase 4: Automated Verification & Test Coverage",
        title: "Update Test Fixtures and Integration Tests",
        description: `Update mock fixtures and integration test assertions to validate the new behavior.`,
        affectedFiles: testsToUpdate,
        riskLevel: "low",
        actionRequired: "Execute complete test suite and assert zero regressions in dependent modules",
      },
    ];

    const riskAreas = [
      {
        area: "API Contract Breakage",
        risk: "Modifications to payload structure or parameter types can cause silent frontend failures.",
        mitigation: "Maintain schema versioning or backwards-compatible response fields during transition.",
      },
      {
        area: "Transitive State Coupling",
        risk: `${uniqueReview.length} dependent files rely on the affected target modules.`,
        mitigation: "Execute incremental smoke tests on downstream services before deploying.",
      },
      {
        area: "Test Suite Regression",
        risk: "Outdated test assertions may fail or produce false positives under new architecture.",
        mitigation: "Update test mocks and run end-to-end integration tests in CI.",
      },
    ];

    return {
      repositoryId,
      userPrompt: prompt,
      summary: `Change plan for "${prompt}": identified ${filesToModify.length} files to modify, ${uniqueReview.length} files to review, and ${testsToUpdate.length} test suites to update.`,
      affectedModels: models.filter((m) => filesToModify.includes(m)),
      affectedServices: services.filter((s) => filesToModify.includes(s) || uniqueReview.includes(s)),
      affectedControllers: controllers.filter((c) => uniqueReview.includes(c)),
      affectedApis: apis.filter((a) => uniqueReview.includes(a)),
      affectedViews: views.filter((v) => uniqueReview.includes(v)),
      affectedTests: testsToUpdate,
      riskAreas,
      filesToModify,
      filesToReview: uniqueReview.slice(0, 8),
      testsToUpdate,
      migrationSteps,
      generatedAt: new Date().toISOString(),
    };
  }
}

export const changePlannerService = new ChangePlannerService();
