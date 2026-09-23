export interface IssueComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface GitHubIssue {
  id: string;
  repositoryId: string;
  githubIssueId: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  author: string;
  comments: IssueComment[];
  linkedPrs: number[];
  createdAt: string;
  updatedAt: string;
}

export interface SuspectedCodeLocation {
  filePath: string;
  symbolName?: string;
  startLine: number;
  endLine: number;
  snippet: string;
  relevanceScore: number;
  rationale: string;
}

export interface SimilarIssue {
  issueNumber: number;
  title: string;
  state: "open" | "closed";
  similarityScore: number;
  resolutionNotes?: string;
  linkedPrs: number[];
}

export interface BugInvestigationResult {
  repositoryId: string;
  query: string;
  suspectedLocations: SuspectedCodeLocation[];
  similarIssues: SimilarIssue[];
  rootCauseHypothesis: string;
  diagnosticSteps: string[];
  suggestedFixSummary: string;
  latencyMs: number;
}

export interface PRChangedFile {
  filename: string;
  status: "added" | "modified" | "deleted" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
}

export interface FileNeedingReview {
  file: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

export interface PullRequestAnalysis {
  repositoryId: string;
  prNumber: number;
  title: string;
  author: string;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  riskJustification: string;
  diffSummary: string;
  changedFiles: PRChangedFile[];
  affectedSymbols: string[];
  filesNeedingHumanReview: FileNeedingReview[];
  reviewChecklist: string[];
  suggestedTests: string[];
  humanReviewOnlyNotice: string;
  analyzedAt: string;
}

export type NodeType =
  | "service"
  | "controller"
  | "model"
  | "router"
  | "module"
  | "util"
  | "view"
  | "component"
  | "endpoint"
  | "test"
  | "symbol";

export interface SymbolEntity {
  id: string;
  fileId: string;
  name: string;
  type: "function" | "class" | "method" | "interface" | "type" | "component" | "variable" | "constant" | "endpoint" | "test";
  startLine: number;
  endLine: number;
  signature?: string;
}

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  path: string;
  language?: string;
  exports: string[];
  imports: string[];
  symbols?: SymbolEntity[];
  lines: number;
  inDegree: number;
  outDegree: number;
  description?: string;
  isTest?: boolean;
  cluster?: string; // e.g. "auth", "services", "components"
}

export type RelationshipType =
  | "IMPORTS"
  | "IMPORTED_BY"
  | "CALLS"
  | "CALLED_BY"
  | "EXTENDS"
  | "IMPLEMENTS"
  | "USES"
  | "DEPENDS_ON"
  | "RENDERS"
  | "TESTS"
  | "TESTED_BY"
  | "API_CALLS"
  | "API_HANDLED_BY"
  | "DEFINED_IN"
  | "CONTAINS"
  | "imports"
  | "calls"
  | "mounts";

export interface EdgeEvidence {
  sourcePath: string;
  targetPath: string;
  sourceLine?: number;
  targetLine?: number;
  sourceSnippet?: string;
  symbol?: string;
}

export interface GraphEdge {
  id?: string;
  source: string;
  target: string;
  type: RelationshipType;
  symbols: string[];
  evidence?: EdgeEvidence;
}

export interface GraphMetrics {
  totalNodes: number;
  totalEdges: number;
  density: number;
  entryPoints: string[];
  coreModules: string[];
  circularDependencies?: string[][];
}

export interface ArchitectureGraph {
  repositoryId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metrics: GraphMetrics;
  mermaidSyntax: string;
  generatedAt: string;
}

export type ImpactSeverity = "HIGH" | "MEDIUM" | "LOW";

export interface ImpactEvidence {
  sourceFile: string;
  targetFile: string;
  sourceLine?: number;
  targetLine?: number;
  relationship: string;
  snippet?: string;
  rationale: string;
}

export interface ImpactedEntity {
  id: string;
  name: string;
  path: string;
  type: NodeType;
  severity: ImpactSeverity;
  depth: number; // 1 = direct, 2+ = transitive
  relationship: string;
  reason: string;
  evidences: ImpactEvidence[];
}

export interface ImpactAnalysisRequest {
  entityId: string; // target node id or path
  changeType?: "modify" | "delete" | "rename" | "replace" | "refactor" | "API_CHANGE" | "DATABASE_CHANGE";
  depthLimit?: number;
}

export interface ImpactAnalysisResult {
  repositoryId: string;
  targetNode: GraphNode;
  changeType: string;
  totalAffected: number;
  directAffectedCount: number;
  indirectAffectedCount: number;
  impactedApisCount: number;
  impactedTestsCount: number;
  impactedComponentsCount: number;
  highImpact: ImpactedEntity[];
  mediumImpact: ImpactedEntity[];
  lowImpact: ImpactedEntity[];
  recommendedValidations: string[];
  analyzedAt: string;
}

export interface WhyExistsResult {
  repositoryId: string;
  targetPath: string;
  symbolName?: string;
  introducedCommit?: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
  relatedPr?: {
    number: number;
    title: string;
  };
  reason: string;
  historicalContext: string;
  evidence: Array<{
    file: string;
    lineRange?: string;
    reference: string;
  }>;
}

export interface ChangePlanRequest {
  description: string;
  targetEntities?: string[];
}

export interface ChangePlanStep {
  phase: string;
  title: string;
  description: string;
  affectedFiles: string[];
  riskLevel: "low" | "medium" | "high";
  actionRequired: string;
}

export interface ChangePlanResult {
  repositoryId: string;
  userPrompt: string;
  summary: string;
  affectedModels: string[];
  affectedServices: string[];
  affectedControllers: string[];
  affectedApis: string[];
  affectedViews: string[];
  affectedTests: string[];
  riskAreas: Array<{ area: string; risk: string; mitigation: string }>;
  filesToModify: string[];
  filesToReview: string[];
  testsToUpdate: string[];
  migrationSteps: ChangePlanStep[];
  generatedAt: string;
}

