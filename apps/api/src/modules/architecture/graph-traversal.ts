import type {
  GraphNode,
  GraphEdge,
  ImpactAnalysisResult,
  ImpactedEntity,
  ImpactEvidence,
} from "@repomind/shared-types";

export class GraphTraversalEngine {
  private nodeMap = new Map<string, GraphNode>();
  private outgoingMap = new Map<string, GraphEdge[]>(); // source -> outgoing edges (dependencies)
  private incomingMap = new Map<string, GraphEdge[]>(); // target -> incoming edges (dependents)

  constructor(nodes: GraphNode[] = [], edges: GraphEdge[] = []) {
    this.init(nodes, edges);
  }

  public init(nodes: GraphNode[], edges: GraphEdge[]): void {
    this.nodeMap.clear();
    this.outgoingMap.clear();
    this.incomingMap.clear();

    for (const node of nodes) {
      this.nodeMap.set(node.id, node);
      this.outgoingMap.set(node.id, []);
      this.incomingMap.set(node.id, []);
    }

    for (const edge of edges) {
      const outList = this.outgoingMap.get(edge.source);
      if (outList) outList.push(edge);

      const inList = this.incomingMap.get(edge.target);
      if (inList) inList.push(edge);
    }
  }

  public getNode(nodeId: string): GraphNode | undefined {
    return this.nodeMap.get(nodeId);
  }

  public findNodeByPathOrName(identifier: string): GraphNode | undefined {
    const cleanId = identifier.trim().toLowerCase();
    for (const [id, node] of this.nodeMap.entries()) {
      if (id === identifier || id.toLowerCase() === cleanId) return node;
      if (node.path.toLowerCase() === cleanId || node.path.toLowerCase().endsWith(cleanId)) return node;
      if (node.name.toLowerCase() === cleanId) return node;
    }
    return undefined;
  }

  /**
   * Returns direct dependencies (what this node calls / imports).
   */
  public getDirectDependencies(nodeId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const outEdges = this.outgoingMap.get(nodeId) || [];
    const depNodes: GraphNode[] = [];
    for (const e of outEdges) {
      const n = this.nodeMap.get(e.target);
      if (n) depNodes.push(n);
    }
    return { nodes: depNodes, edges: outEdges };
  }

  /**
   * Returns direct dependents (what calls / imports this node - immediate blast radius).
   */
  public getDirectDependents(nodeId: string): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const inEdges = this.incomingMap.get(nodeId) || [];
    const depNodes: GraphNode[] = [];
    for (const e of inEdges) {
      const n = this.nodeMap.get(e.source);
      if (n) depNodes.push(n);
    }
    return { nodes: depNodes, edges: inEdges };
  }

  /**
   * Returns the N-hop neighborhood (both upstream and downstream) around a focus node.
   */
  public getNeighborhood(
    focusNodeId: string,
    depth = 1,
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const visitedNodes = new Set<string>();
    const includedEdges: GraphEdge[] = [];
    const queue: Array<{ id: string; currentDepth: number }> = [{ id: focusNodeId, currentDepth: 0 }];
    visitedNodes.add(focusNodeId);

    while (queue.length > 0) {
      const { id, currentDepth } = queue.shift()!;
      if (currentDepth >= depth) continue;

      // Check outgoing
      const outEdges = this.outgoingMap.get(id) || [];
      for (const e of outEdges) {
        includedEdges.push(e);
        if (!visitedNodes.has(e.target)) {
          visitedNodes.add(e.target);
          queue.push({ id: e.target, currentDepth: currentDepth + 1 });
        }
      }

      // Check incoming
      const inEdges = this.incomingMap.get(id) || [];
      for (const e of inEdges) {
        includedEdges.push(e);
        if (!visitedNodes.has(e.source)) {
          visitedNodes.add(e.source);
          queue.push({ id: e.source, currentDepth: currentDepth + 1 });
        }
      }
    }

    const resultNodes: GraphNode[] = [];
    for (const nId of visitedNodes) {
      const n = this.nodeMap.get(nId);
      if (n) resultNodes.push(n);
    }

    // Deduplicate edges
    const edgeSet = new Set<string>();
    const uniqueEdges = includedEdges.filter((e) => {
      const k = `${e.source}->${e.target}:${e.type}`;
      if (edgeSet.has(k)) return false;
      edgeSet.add(k);
      return true;
    });

    return { nodes: resultNodes, edges: uniqueEdges };
  }

  /**
   * Detects circular dependency cycles across the graph using DFS.
   */
  public findCycles(): string[][] {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const cycles: string[][] = [];
    const pathStack: string[] = [];

    const dfs = (curr: string) => {
      visited.add(curr);
      recStack.add(curr);
      pathStack.push(curr);

      const outEdges = this.outgoingMap.get(curr) || [];
      for (const e of outEdges) {
        if (!visited.has(e.target)) {
          dfs(e.target);
        } else if (recStack.has(e.target)) {
          // Cycle found
          const cycleStart = pathStack.indexOf(e.target);
          if (cycleStart !== -1) {
            const cyclePath = pathStack.slice(cycleStart).map((id) => this.nodeMap.get(id)?.name || id);
            cyclePath.push(this.nodeMap.get(e.target)?.name || e.target);
            cycles.push(cyclePath);
          }
        }
      }

      recStack.delete(curr);
      pathStack.pop();
    };

    for (const nodeId of this.nodeMap.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles.slice(0, 10); // cap to top 10 cycles
  }

  /**
   * Deterministic Impact Analysis Engine:
   * Traverses reverse dependents closure to compute affected entities,
   * classifications (HIGH, MEDIUM, LOW), reasons, and source line evidence.
   */
  public analyzeImpact(
    repositoryId: string,
    targetNodeId: string,
    changeType: string = "modify",
    depthLimit: number = 4,
  ): ImpactAnalysisResult {
    const targetNode = this.getNode(targetNodeId) || this.findNodeByPathOrName(targetNodeId);

    if (!targetNode) {
      throw new Error(`Target node '${targetNodeId}' not found in dependency graph`);
    }

    const highImpact: ImpactedEntity[] = [];
    const mediumImpact: ImpactedEntity[] = [];
    const lowImpact: ImpactedEntity[] = [];

    // Track visited nodes and their minimum depth from target
    const visited = new Map<string, { depth: number; edge: GraphEdge }>();
    const queue: Array<{ id: string; depth: number }> = [{ id: targetNode.id, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= depthLimit) continue;

      // Downstream dependents are nodes that have an edge pointing TO `id`
      const inEdges = this.incomingMap.get(id) || [];

      for (const edge of inEdges) {
        const dependentId = edge.source;
        if (dependentId === targetNode.id) continue;

        if (!visited.has(dependentId) || visited.get(dependentId)!.depth > depth + 1) {
          visited.set(dependentId, { depth: depth + 1, edge });
          queue.push({ id: dependentId, depth: depth + 1 });
        }
      }
    }

    // Also check dedicated test files that test the target directly
    const directTests: GraphNode[] = [];
    for (const [nId, n] of this.nodeMap.entries()) {
      if (n.isTest) {
        const out = this.outgoingMap.get(nId) || [];
        if (out.some((e) => e.target === targetNode.id)) {
          directTests.push(n);
        }
      }
    }

    // Evaluate impact classifications
    for (const [depId, { depth, edge }] of visited.entries()) {
      const node = this.nodeMap.get(depId);
      if (!node) continue;

      const isDirect = depth === 1;
      const isTest = node.isTest || edge.type === "TESTS";
      const isCall = edge.type === "CALLS";
      const isRender = edge.type === "RENDERS";
      const isApi = edge.type === "API_CALLS";

      const evidences: ImpactEvidence[] = [];
      if (edge.evidence) {
        evidences.push({
          sourceFile: edge.evidence.sourcePath,
          targetFile: edge.evidence.targetPath,
          sourceLine: edge.evidence.sourceLine,
          targetLine: edge.evidence.targetLine,
          relationship: edge.type,
          snippet: edge.evidence.sourceSnippet,
          rationale: `${edge.type} reference at line ${edge.evidence.sourceLine || "N/A"}`,
        });
      }

      let severity: "HIGH" | "MEDIUM" | "LOW" = "LOW";
      let reason = "";

      if (isDirect) {
        severity = "HIGH";
        if (isTest) {
          reason = `Dedicated automated test verifying ${targetNode.name}.`;
        } else if (isCall) {
          reason = `Directly calls functions/methods declared in ${targetNode.name}.`;
        } else if (isRender) {
          reason = `Directly renders JSX component defined in ${targetNode.name}.`;
        } else if (isApi) {
          reason = `Consumes API endpoint handled by ${targetNode.name}.`;
        } else {
          reason = `Directly imports module ${targetNode.name}.`;
        }
      } else if (depth === 2) {
        severity = "MEDIUM";
        reason = `Transitive dependent: depends on intermediate module that directly relies on ${targetNode.name}.`;
      } else {
        severity = "LOW";
        reason = `Indirect dependent: ${depth} hops away in the dependency graph hierarchy.`;
      }

      // Upgrade severity if critical change type
      if (changeType === "delete" || changeType === "replace") {
        if (depth === 2) severity = "HIGH";
      }

      const impactedEntity: ImpactedEntity = {
        id: node.id,
        name: node.name,
        path: node.path,
        type: node.type,
        severity,
        depth,
        relationship: edge.type,
        reason,
        evidences,
      };

      if (severity === "HIGH") {
        highImpact.push(impactedEntity);
      } else if (severity === "MEDIUM") {
        mediumImpact.push(impactedEntity);
      } else {
        lowImpact.push(impactedEntity);
      }
    }

    // Ensure direct tests are included in high impact
    for (const testNode of directTests) {
      if (!highImpact.some((e) => e.id === testNode.id)) {
        highImpact.push({
          id: testNode.id,
          name: testNode.name,
          path: testNode.path,
          type: "test",
          severity: "HIGH",
          depth: 1,
          relationship: "TESTS",
          reason: `Dedicated test suite covering ${targetNode.name}.`,
          evidences: [
            {
              sourceFile: testNode.path,
              targetFile: targetNode.path,
              relationship: "TESTS",
              rationale: `Automated test suite covering ${targetNode.name}`,
            },
          ],
        });
      }
    }

    const totalAffected = highImpact.length + mediumImpact.length + lowImpact.length;
    const directAffectedCount = highImpact.filter((e) => e.depth === 1).length;
    const indirectAffectedCount = totalAffected - directAffectedCount;

    const allImpacted = [...highImpact, ...mediumImpact, ...lowImpact];
    const impactedTestsCount = allImpacted.filter((e) => e.type === "test").length;
    const impactedApisCount = allImpacted.filter((e) => e.type === "router" || e.relationship === "API_CALLS").length;
    const impactedComponentsCount = allImpacted.filter((e) => e.type === "component" || e.relationship === "RENDERS").length;

    // Recommended validation steps
    const recommendedValidations: string[] = [];
    const testEntities = allImpacted.filter((e) => e.type === "test");
    if (testEntities.length > 0) {
      recommendedValidations.push(`Run test suite: ${testEntities.map((t) => t.name).slice(0, 3).join(", ")}`);
    } else {
      recommendedValidations.push(`Write unit test for ${targetNode.name} before refactoring`);
    }

    const apiEntities = allImpacted.filter((e) => e.type === "router" || e.relationship === "API_CALLS");
    if (apiEntities.length > 0) {
      recommendedValidations.push(`Validate contract of endpoints handled in ${apiEntities[0].name}`);
    }

    if (impactedComponentsCount > 0) {
      recommendedValidations.push(`Verify UI rendering and prop contracts in ${allImpacted.find((e) => e.type === "component")?.name || "views"}`);
    }

    recommendedValidations.push(`Perform regression check on ${targetNode.name} exported symbols`);

    return {
      repositoryId,
      targetNode,
      changeType,
      totalAffected,
      directAffectedCount,
      indirectAffectedCount,
      impactedApisCount,
      impactedTestsCount,
      impactedComponentsCount,
      highImpact,
      mediumImpact,
      lowImpact,
      recommendedValidations,
      analyzedAt: new Date().toISOString(),
    };
  }

  /**
   * Directional and Depth filtering:
   * direction: "upstream" (dependencies), "downstream" (dependents), or "both".
   */
  public getFilteredDirectionalSubgraph(
    focusNodeId: string,
    depth = 1,
    direction: "upstream" | "downstream" | "both" = "both",
    allowedRelationships?: string[],
  ): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const visitedNodes = new Set<string>([focusNodeId]);
    const includedEdges: GraphEdge[] = [];
    const queue: Array<{ id: string; currentDepth: number }> = [{ id: focusNodeId, currentDepth: 0 }];

    while (queue.length > 0) {
      const { id, currentDepth } = queue.shift()!;
      if (currentDepth >= depth) continue;

      if (direction === "upstream" || direction === "both") {
        const outEdges = this.outgoingMap.get(id) || [];
        for (const e of outEdges) {
          if (allowedRelationships && !allowedRelationships.includes(e.type)) continue;
          includedEdges.push(e);
          if (!visitedNodes.has(e.target)) {
            visitedNodes.add(e.target);
            queue.push({ id: e.target, currentDepth: currentDepth + 1 });
          }
        }
      }

      if (direction === "downstream" || direction === "both") {
        const inEdges = this.incomingMap.get(id) || [];
        for (const e of inEdges) {
          if (allowedRelationships && !allowedRelationships.includes(e.type)) continue;
          includedEdges.push(e);
          if (!visitedNodes.has(e.source)) {
            visitedNodes.add(e.source);
            queue.push({ id: e.source, currentDepth: currentDepth + 1 });
          }
        }
      }
    }

    const resultNodes: GraphNode[] = [];
    for (const nId of visitedNodes) {
      const n = this.nodeMap.get(nId);
      if (n) resultNodes.push(n);
    }

    const edgeSet = new Set<string>();
    const uniqueEdges = includedEdges.filter((e) => {
      const k = `${e.source}->${e.target}:${e.type}`;
      if (edgeSet.has(k)) return false;
      edgeSet.add(k);
      return true;
    });

    return { nodes: resultNodes, edges: uniqueEdges };
  }

  /**
   * Multi-Level Architecture Hierarchy:
   * Level 1: System Level (Frontend, Backend API, Domain Services, Models, Utils, Tests)
   * Level 2: Service / Package Level (Auth, Repos, RAG, Chunking, Ingestion, UI)
   * Level 3: File Level (Concrete Files)
   * Level 4: Symbol Level (Functions, Classes, Components, Methods, Endpoints)
   */
  public buildClusteredGraph(level: 1 | 2 | 3 | 4): { nodes: GraphNode[]; edges: GraphEdge[] } {
    if (level === 3) {
      // Return file-level nodes
      return {
        nodes: Array.from(this.nodeMap.values()),
        edges: Array.from(this.outgoingMap.values()).flat(),
      };
    }

    if (level === 1) {
      // System Level
      const systemLayers: Record<string, { name: string; type: GraphNode["type"]; description: string }> = {
        sys_api: { name: "API & Routing Layer", type: "router", description: "Public REST, Webhook, and WebSocket endpoints" },
        sys_services: { name: "Domain Services", type: "service", description: "Business logic, orchestration, and integrations" },
        sys_models: { name: "Persistence Models", type: "model", description: "Relational data schemas and storage models" },
        sys_views: { name: "UI & Component Views", type: "component", description: "Interactive user interfaces and design layouts" },
        sys_utils: { name: "Core Utilities", type: "util", description: "Shared procedural helpers and cryptographics" },
        sys_tests: { name: "Test Suites", type: "test", description: "Automated regression and unit verification" },
      };

      const fileToSystemMap = new Map<string, string>();
      for (const node of this.nodeMap.values()) {
        if (node.isTest || node.type === "test") fileToSystemMap.set(node.id, "sys_tests");
        else if (node.type === "router" || node.type === "endpoint") fileToSystemMap.set(node.id, "sys_api");
        else if (node.type === "controller" || node.type === "service") fileToSystemMap.set(node.id, "sys_services");
        else if (node.type === "model") fileToSystemMap.set(node.id, "sys_models");
        else if (node.type === "component" || node.type === "view") fileToSystemMap.set(node.id, "sys_views");
        else fileToSystemMap.set(node.id, "sys_utils");
      }

      const clusterNodes: GraphNode[] = Object.entries(systemLayers).map(([sysId, info]) => {
        const memberFiles = Array.from(fileToSystemMap.entries()).filter(([, sId]) => sId === sysId);
        return {
          id: sysId,
          name: info.name,
          type: info.type,
          path: sysId,
          exports: [],
          imports: [],
          lines: memberFiles.length * 120,
          inDegree: 0,
          outDegree: 0,
          description: info.description,
        };
      });

      const clusterEdges: GraphEdge[] = [];
      const edgeWeightMap = new Map<string, number>();

      for (const edge of Array.from(this.outgoingMap.values()).flat()) {
        const srcSys = fileToSystemMap.get(edge.source);
        const tgtSys = fileToSystemMap.get(edge.target);
        if (srcSys && tgtSys && srcSys !== tgtSys) {
          const k = `${srcSys}->${tgtSys}`;
          edgeWeightMap.set(k, (edgeWeightMap.get(k) || 0) + 1);
        }
      }

      for (const [k, count] of edgeWeightMap.entries()) {
        const [src, tgt] = k.split("->");
        clusterEdges.push({
          id: `edge_${src}_${tgt}`,
          source: src,
          target: tgt,
          type: "DEPENDS_ON",
          symbols: [`${count} interactions`],
        });
      }

      return { nodes: clusterNodes, edges: clusterEdges };
    }

    if (level === 2) {
      // Service / Package Domain Level
      const domainMap = new Map<string, string>(); // nodeId -> domainId
      const domains = new Set<string>();

      for (const node of this.nodeMap.values()) {
        const d = node.cluster || "core";
        domainMap.set(node.id, `domain_${d}`);
        domains.add(d);
      }

      const domainNodes: GraphNode[] = Array.from(domains).map((d) => {
        const domainId = `domain_${d}`;
        const memberFiles = Array.from(domainMap.entries()).filter(([, dId]) => dId === domainId);
        return {
          id: domainId,
          name: `${d.toUpperCase()} Package`,
          type: "service",
          path: d,
          exports: [],
          imports: [],
          lines: memberFiles.length * 90,
          inDegree: 0,
          outDegree: 0,
          description: `Architectural subsystem encapsulating ${d} domain procedures`,
          cluster: d,
        };
      });

      const domainEdges: GraphEdge[] = [];
      const edgeWeightMap = new Map<string, number>();

      for (const edge of Array.from(this.outgoingMap.values()).flat()) {
        const srcD = domainMap.get(edge.source);
        const tgtD = domainMap.get(edge.target);
        if (srcD && tgtD && srcD !== tgtD) {
          const k = `${srcD}->${tgtD}`;
          edgeWeightMap.set(k, (edgeWeightMap.get(k) || 0) + 1);
        }
      }

      for (const [k, count] of edgeWeightMap.entries()) {
        const [src, tgt] = k.split("->");
        domainEdges.push({
          id: `edge_${src}_${tgt}`,
          source: src,
          target: tgt,
          type: "DEPENDS_ON",
          symbols: [`${count} references`],
        });
      }

      return { nodes: domainNodes, edges: domainEdges };
    }

    // Level 4: Symbol Level (Functions, Classes, Endpoints, Methods)
    const symbolNodes: GraphNode[] = [];
    const symbolEdges: GraphEdge[] = [];
    const symbolLookup = new Map<string, string>(); // symbolName -> symbolNodeId

    for (const fileNode of this.nodeMap.values()) {
      if (fileNode.symbols && fileNode.symbols.length > 0) {
        for (const sym of fileNode.symbols) {
          const symId = `sym_${fileNode.id}_${sym.name}`;
          symbolLookup.set(sym.name, symId);

          symbolNodes.push({
            id: symId,
            name: sym.name,
            type: sym.type === "component" ? "component" : sym.type === "endpoint" ? "router" : "service",
            path: `${fileNode.path}:${sym.startLine}`,
            exports: [],
            imports: [],
            lines: sym.endLine - sym.startLine + 1,
            inDegree: 0,
            outDegree: 0,
            description: sym.signature || `${sym.type} declared in ${fileNode.name}`,
          });
        }
      } else {
        // Fallback for file if no AST symbols
        symbolNodes.push({
          ...fileNode,
          name: fileNode.name,
        });
      }
    }

    // Map edges between symbols
    for (const fileEdge of Array.from(this.outgoingMap.values()).flat()) {
      if (fileEdge.symbols && fileEdge.symbols.length > 0) {
        for (const symName of fileEdge.symbols) {
          const tgtSymId = symbolLookup.get(symName);
          if (tgtSymId) {
            symbolEdges.push({
              source: fileEdge.source,
              target: tgtSymId,
              type: fileEdge.type,
              symbols: [symName],
            });
          }
        }
      } else {
        symbolEdges.push(fileEdge);
      }
    }

    return {
      nodes: symbolNodes.slice(0, 100), // Cap to 100 symbols for buttery smooth 60fps rendering
      edges: symbolEdges.slice(0, 150),
    };
  }
}

export const graphTraversalEngine = new GraphTraversalEngine();
