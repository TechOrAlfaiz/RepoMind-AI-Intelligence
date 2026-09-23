import path from "node:path";
import type { GraphNode, GraphEdge, NodeType, SymbolEntity } from "@repomind/shared-types";
import type { FileAstAnalysis } from "./ts-ast-analyzer.js";

export interface NormalizedGraphOutput {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export class DependencyNormalizer {
  /**
   * Normalizes static AST analyses into a clean, typed, deterministic dependency graph.
   */
  public normalize(
    analyses: FileAstAnalysis[],
    fileLinesMap: Map<string, number>,
  ): NormalizedGraphOutput {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const edgeKeys = new Set<string>();

    // 1. Path lookup maps
    const pathToNodeId = new Map<string, string>();
    const nodeByPath = new Map<string, GraphNode>();
    const symbolToNodeMap = new Map<string, { nodeId: string; symbol: SymbolEntity }>();
    const endpointToNodeMap = new Map<string, string>();

    // Build Node objects
    for (const analysis of analyses) {
      const p = analysis.filePath.replace(/\\/g, "/");
      const baseName = path.basename(p);
      const nameWithoutExt = baseName.replace(/\.[^/.]+$/, "");
      const nodeId = `node_${p.replace(/[^a-zA-Z0-9_]/g, "_")}`;

      pathToNodeId.set(p, nodeId);
      pathToNodeId.set(p.replace(/\.[^/.]+$/, ""), nodeId);
      pathToNodeId.set(nameWithoutExt, nodeId);

      const type = this.classifyNodeType(p, analysis);
      const lines = fileLinesMap.get(p) || (analysis.symbols.length > 0 ? analysis.symbols[analysis.symbols.length - 1].endLine : 50);

      // Collect all export names
      const exports = analysis.symbols.map((s) => s.name);
      const importNames = analysis.imports.map((i) => i.moduleSpecifier);

      const node: GraphNode = {
        id: nodeId,
        name: baseName,
        type,
        path: p,
        language: analysis.language,
        exports,
        imports: importNames,
        symbols: analysis.symbols,
        lines,
        inDegree: 0,
        outDegree: 0,
        description: this.deriveNodeDescription(baseName, type),
        isTest: analysis.isTestFile,
        cluster: this.deriveCluster(p),
      };

      nodes.push(node);
      nodeByPath.set(p, node);

      // Register symbols
      for (const sym of analysis.symbols) {
        symbolToNodeMap.set(sym.name, { nodeId, symbol: sym });
      }

      // Register backend endpoints
      for (const ep of analysis.endpoints) {
        endpointToNodeMap.set(ep.path, nodeId);
      }
    }

    // Helper to resolve an import path
    const resolveImport = (sourcePath: string, modSpecifier: string): string | undefined => {
      // 1. Relative import
      if (modSpecifier.startsWith(".")) {
        const dir = path.dirname(sourcePath);
        const resolved = path.join(dir, modSpecifier).replace(/\\/g, "/");
        const cleanResolved = resolved.replace(/\.[a-zA-Z0-9]+$/, "");

        if (pathToNodeId.has(resolved)) return pathToNodeId.get(resolved);
        if (pathToNodeId.has(cleanResolved)) return pathToNodeId.get(cleanResolved);
        if (pathToNodeId.has(`${cleanResolved}/index`)) return pathToNodeId.get(`${cleanResolved}/index`);

        // Basename fallback
        const base = path.basename(cleanResolved);
        for (const [key, id] of pathToNodeId.entries()) {
          if (path.basename(key).replace(/\.[^/.]+$/, "") === base) {
            return id;
          }
        }
      } else {
        // Alias import (e.g. "@/components/Button" or "components/Button")
        const stripped = modSpecifier.replace(/^@\//, "");
        for (const [key, id] of pathToNodeId.entries()) {
          if (key.endsWith(stripped) || key.includes(stripped)) {
            return id;
          }
        }
      }
      return undefined;
    };

    // Helper to add edge
    const addEdge = (
      sourceId: string,
      targetId: string,
      relType: GraphEdge["type"],
      symbolsList: string[],
      evidence?: GraphEdge["evidence"]
    ) => {
      if (sourceId === targetId) return;
      const key = `${sourceId}->${targetId}:${relType}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);

      edges.push({
        id: `edge_${sourceId}_${targetId}_${relType.toLowerCase()}`,
        source: sourceId,
        target: targetId,
        type: relType,
        symbols: symbolsList,
        evidence,
      });

      const srcNode = nodes.find((n) => n.id === sourceId);
      const tgtNode = nodes.find((n) => n.id === targetId);
      if (srcNode) srcNode.outDegree++;
      if (tgtNode) tgtNode.inDegree++;
    };

    // 2. Build Typed Edges from Analyses
    for (const analysis of analyses) {
      const sourcePath = analysis.filePath.replace(/\\/g, "/");
      const sourceNodeId = pathToNodeId.get(sourcePath);
      if (!sourceNodeId) continue;

      // A. IMPORTS & TESTS
      for (const imp of analysis.imports) {
        const targetNodeId = resolveImport(sourcePath, imp.moduleSpecifier);
        if (targetNodeId) {
          const relType = analysis.isTestFile ? "TESTS" : "IMPORTS";
          addEdge(sourceNodeId, targetNodeId, relType, imp.importedSymbols, {
            sourcePath,
            targetPath: nodes.find((n) => n.id === targetNodeId)?.path || imp.moduleSpecifier,
            sourceLine: imp.line,
            sourceSnippet: imp.snippet,
          });
        }
      }

      // B. CALLS
      for (const call of analysis.calls) {
        const target = symbolToNodeMap.get(call.callee);
        if (target && target.nodeId !== sourceNodeId) {
          addEdge(sourceNodeId, target.nodeId, "CALLS", [call.callee], {
            sourcePath,
            targetPath: nodes.find((n) => n.id === target.nodeId)?.path || "",
            sourceLine: call.line,
            sourceSnippet: call.snippet,
            symbol: call.callee,
          });
        }
      }

      // C. RENDERS (React Components)
      for (const render of analysis.renders) {
        const target = symbolToNodeMap.get(render.componentName);
        if (target && target.nodeId !== sourceNodeId) {
          addEdge(sourceNodeId, target.nodeId, "RENDERS", [render.componentName], {
            sourcePath,
            targetPath: nodes.find((n) => n.id === target.nodeId)?.path || "",
            sourceLine: render.line,
            sourceSnippet: render.snippet,
            symbol: render.componentName,
          });
        }
      }

      // D. EXTENDS & IMPLEMENTS
      for (const h of analysis.heritage) {
        const target = symbolToNodeMap.get(h.superClass);
        if (target && target.nodeId !== sourceNodeId) {
          addEdge(
            sourceNodeId,
            target.nodeId,
            h.type === "implements" ? "IMPLEMENTS" : "EXTENDS",
            [h.superClass],
            {
              sourcePath,
              targetPath: nodes.find((n) => n.id === target.nodeId)?.path || "",
              sourceLine: h.line,
              sourceSnippet: `class ${h.subClass} ${h.type} ${h.superClass}`,
              symbol: h.superClass,
            }
          );
        }
      }

      // E. TESTS
      if (analysis.isTestFile) {
        for (const testedMod of analysis.testedModules) {
          const targetNodeId = resolveImport(sourcePath, testedMod);
          if (targetNodeId) {
            addEdge(sourceNodeId, targetNodeId, "TESTS", [], {
              sourcePath,
              targetPath: nodes.find((n) => n.id === targetNodeId)?.path || testedMod,
              sourceLine: 1,
              sourceSnippet: `Test suite verifies ${testedMod}`,
            });
          }
        }
      }

      // F. API_CALLS -> API_HANDLED_BY
      for (const apiCall of analysis.apiCalls) {
        const targetNodeId = endpointToNodeMap.get(apiCall.endpointUrl);
        if (targetNodeId && targetNodeId !== sourceNodeId) {
          addEdge(sourceNodeId, targetNodeId, "API_CALLS", [apiCall.endpointUrl], {
            sourcePath,
            targetPath: nodes.find((n) => n.id === targetNodeId)?.path || "",
            sourceLine: apiCall.line,
            sourceSnippet: apiCall.snippet,
          });
        }
      }
    }

    return { nodes, edges };
  }

  private classifyNodeType(filePath: string, analysis: FileAstAnalysis): NodeType {
    const lower = filePath.toLowerCase();
    if (analysis.isTestFile) return "test";
    if (lower.includes("router") || lower.includes("route") || lower.includes("/api/")) return "router";
    if (lower.includes("controller")) return "controller";
    if (lower.includes("service")) return "service";
    if (lower.includes("model") || lower.includes("schema") || lower.includes("entity")) return "model";
    if (lower.includes("component") || lower.includes("/views/") || lower.includes("/ui/") || lower.endsWith(".tsx") || lower.endsWith(".jsx")) {
      return "component";
    }
    if (lower.includes("util") || lower.includes("helper") || lower.includes("lib/")) return "util";
    if (lower.includes("endpoint")) return "endpoint";
    return "module";
  }

  private deriveCluster(filePath: string): string {
    const parts = filePath.split("/").filter(Boolean);
    if (parts.length > 1) {
      if (parts[0] === "src" || parts[0] === "lib" || parts[0] === "apps") {
        return parts[1] || "core";
      }
      return parts[0];
    }
    return "root";
  }

  private deriveNodeDescription(name: string, type: NodeType): string {
    switch (type) {
      case "router":
        return `HTTP routing layer defining REST/WebSocket endpoints for ${name}`;
      case "controller":
        return `Request handling controller coordinating domain logic for ${name}`;
      case "service":
        return `Domain business logic and orchestration service for ${name}`;
      case "model":
        return `Data schema and persistence model representing ${name}`;
      case "component":
        return `Interactive UI component rendering views for ${name}`;
      case "test":
        return `Automated test suite verifying stability for ${name}`;
      case "util":
        return `Reusable procedures and utility functions for ${name}`;
      default:
        return `Core module encapsulating ${name}`;
    }
  }
}

export const dependencyNormalizer = new DependencyNormalizer();
