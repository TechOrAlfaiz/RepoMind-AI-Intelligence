import { useState, useEffect } from "react";
import {
  GitPullRequest,
  Bug,
  Network,
  ShieldAlert,
  CheckCircle,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import type {
  ArchitectureGraph,
  BugInvestigationResult,
  PullRequestAnalysis,
  Repository,
} from "@repomind/shared-types";

interface ArchitectureModalProps {
  repo: Repository;
  isOpen: boolean;
  initialTab?: "architecture" | "bug" | "pr";
  onClose: () => void;
  onOpenCitation?: (citation: {
    chunkId: string;
    fileId: string;
    filePath: string;
    startLine: number;
    endLine: number;
  }) => void;
}

export function ArchitectureModal({
  repo,
  isOpen,
  initialTab = "architecture",
  onClose,
}: ArchitectureModalProps) {
  const [activeTab, setActiveTab] = useState<"architecture" | "bug" | "pr">(initialTab);

  // Architecture Graph State
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [copiedMermaid, setCopiedMermaid] = useState(false);

  // Bug Investigator State
  const [bugQuery, setBugQuery] = useState(
    "Authentication failure with invalid signature or expired token in crypto vault",
  );
  const [investigating, setInvestigating] = useState(false);
  const [bugResult, setBugResult] = useState<BugInvestigationResult | null>(null);

  // PR Analyzer State
  const [prTitle, setPrTitle] = useState("feat: rotate AES encryption key and update vault signature");
  const [prAuthor, setPrAuthor] = useState("dev-contributor");
  const [samplePrType, setSamplePrType] = useState<"security" | "feature">("security");
  const [analyzingPr, setAnalyzingPr] = useState(false);
  const [prAnalysis, setPrAnalysis] = useState<PullRequestAnalysis | null>(null);

  useEffect(() => {
    if (isOpen && !graph) {
      loadGraph();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function loadGraph() {
    setLoadingGraph(true);
    try {
      const res = await fetch(`http://localhost:4000/api/repos/${repo.id}/architecture-graph`);
      if (res.ok) {
        const data = await res.json();
        setGraph(data);
      }
    } catch (e) {
      console.error("Failed to load architecture graph:", e);
    } finally {
      setLoadingGraph(false);
    }
  }

  async function handleInvestigateBug() {
    if (!bugQuery.trim()) return;
    setInvestigating(true);
    try {
      const res = await fetch(`http://localhost:4000/api/repos/${repo.id}/investigate-bug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: bugQuery.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setBugResult(data);
      }
    } catch (e) {
      console.error("Bug investigation failed:", e);
    } finally {
      setInvestigating(false);
    }
  }

  async function handleAnalyzePR() {
    setAnalyzingPr(true);

    const changedFiles =
      samplePrType === "security"
        ? [
            {
              filename: "src/security/vault.ts",
              status: "modified" as const,
              additions: 45,
              deletions: 12,
              patch: "export function encryptVaultToken(...) { ... }",
            },
            {
              filename: "src/modules/auth/auth.service.ts",
              status: "modified" as const,
              additions: 30,
              deletions: 10,
              patch: "const decrypted = decryptToken(raw);",
            },
          ]
        : [
            {
              filename: "src/utils/formatting.ts",
              status: "modified" as const,
              additions: 15,
              deletions: 5,
              patch: "export function formatDate(d: Date): string",
            },
            {
              filename: "README.md",
              status: "modified" as const,
              additions: 10,
              deletions: 2,
            },
          ];

    try {
      const res = await fetch(`http://localhost:4000/api/repos/${repo.id}/analyze-pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prNumber: 42,
          title: prTitle,
          author: prAuthor,
          changedFiles,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPrAnalysis(data);
      }
    } catch (e) {
      console.error("PR analysis failed:", e);
    } finally {
      setAnalyzingPr(false);
    }
  }

  const copyMermaidSyntax = () => {
    if (!graph?.mermaidSyntax) return;
    navigator.clipboard.writeText(graph.mermaidSyntax);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-lg font-bold shadow-md">
              ⚡
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Engineering Intelligence & Architecture
              </h2>
              <p className="text-xs text-slate-400">
                Static Dependency Graph, Bug Investigation & Advisory PR Review for{" "}
                <span className="text-indigo-400 font-mono">{repo.fullName}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("architecture")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "architecture"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Architecture Graph
            </button>
            <button
              onClick={() => setActiveTab("bug")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "bug"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Bug className="w-3.5 h-3.5" />
              Bug Investigator
            </button>
            <button
              onClick={() => setActiveTab("pr")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "pr"
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              PR Reviewer
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: ARCHITECTURE GRAPH */}
          {activeTab === "architecture" && (
            <div className="space-y-6">
              {/* Metrics Summary */}
              {graph && (
                <div className="grid grid-cols-5 gap-3">
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">Components</div>
                    <div className="text-xl font-bold text-white font-mono mt-1">
                      {graph.metrics.totalNodes}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">Dependencies</div>
                    <div className="text-xl font-bold text-indigo-400 font-mono mt-1">
                      {graph.metrics.totalEdges}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">Graph Density</div>
                    <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                      {graph.metrics.density}
                    </div>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl col-span-2">
                    <div className="text-[11px] text-slate-400 font-medium">Core Modules (In-Degree)</div>
                    <div className="text-xs text-slate-300 font-mono mt-1 truncate">
                      {graph.metrics.coreModules.join(", ") || "None"}
                    </div>
                  </div>
                </div>
              )}

              {/* Invariant Banner */}
              <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between">
                <span>
                  <strong className="text-white">Deterministic Invariant:</strong> Graph nodes and import/call edges are derived exclusively from static AST analysis — zero LLM hallucination.
                </span>
                <button
                  onClick={loadGraph}
                  disabled={loadingGraph}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1 transition disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingGraph ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {/* Component Nodes Grid */}
              {graph && (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Discovered Components ({graph.nodes.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                    {graph.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-white truncate">
                            {node.name}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                              node.type === "service"
                                ? "bg-purple-900/40 text-purple-300 border border-purple-800"
                                : node.type === "router"
                                  ? "bg-indigo-900/40 text-indigo-300 border border-indigo-800"
                                  : node.type === "model"
                                    ? "bg-emerald-900/40 text-emerald-300 border border-emerald-800"
                                    : "bg-slate-800 text-slate-300"
                            }`}
                          >
                            {node.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">{node.description}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-mono">
                          <span>In: {node.inDegree} | Out: {node.outDegree}</span>
                          <span>{node.lines} lines</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mermaid Diagram Code & Viewer */}
              {graph && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Mermaid Architecture Diagram Syntax
                    </h3>
                    <button
                      onClick={copyMermaidSyntax}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs flex items-center gap-1.5 transition"
                    >
                      {copiedMermaid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedMermaid ? "Copied" : "Copy Mermaid"}
                    </button>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 overflow-x-auto max-h-56 leading-relaxed">
                    {graph.mermaidSyntax}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: BUG INVESTIGATOR */}
          {activeTab === "bug" && (
            <div className="space-y-6">
              {/* Query Input */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <label className="text-xs font-semibold text-slate-300">
                  Bug Symptom or Error Query
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bugQuery}
                    onChange={(e) => setBugQuery(e.target.value)}
                    placeholder="e.g. TypeError: Cannot read property 'token' of undefined in auth callback"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                  />
                  <button
                    onClick={handleInvestigateBug}
                    disabled={investigating || !bugQuery.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
                  >
                    {investigating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bug className="w-3.5 h-3.5" />}
                    {investigating ? "Investigating..." : "Investigate Bug"}
                  </button>
                </div>
              </div>

              {/* Bug Results */}
              {bugResult && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Hypothesis Card */}
                  <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-2">
                    <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs uppercase tracking-wider">
                      <Sparkles className="w-4 h-4" /> Root Cause Hypothesis
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {bugResult.rootCauseHypothesis}
                    </p>
                    <div className="pt-2 text-[11px] text-slate-400">
                      <strong>Suggested Fix:</strong> {bugResult.suggestedFixSummary}
                    </div>
                  </div>

                  {/* Suspected Code Locations */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Suspected Code Locations ({bugResult.suspectedLocations.length})
                    </h3>
                    <div className="space-y-2">
                      {bugResult.suspectedLocations.map((loc, i) => (
                        <div
                          key={i}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-indigo-300">
                              {loc.filePath}:{loc.startLine}-{loc.endLine}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                              Score: {loc.relevanceScore}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{loc.rationale}</p>
                          <pre className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                            {loc.snippet}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Similar Historical Issues */}
                  {bugResult.similarIssues.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Similar Historical Issues ({bugResult.similarIssues.length})
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        {bugResult.similarIssues.map((issue) => (
                          <div
                            key={issue.issueNumber}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-bold text-white">
                                #{issue.issueNumber} {issue.title}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  issue.state === "closed"
                                    ? "bg-purple-900/30 text-purple-300 border border-purple-800"
                                    : "bg-emerald-900/30 text-emerald-300 border border-emerald-800"
                                }`}
                              >
                                {issue.state}
                              </span>
                            </div>
                            {issue.resolutionNotes && (
                              <p className="text-[11px] text-slate-400 italic">
                                {issue.resolutionNotes}
                              </p>
                            )}
                            <div className="text-[10px] text-slate-500 font-mono">
                              Similarity: {Math.round(issue.similarityScore * 100)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PR REVIEWER */}
          {activeTab === "pr" && (
            <div className="space-y-6">
              {/* Advisory Invariant Banner */}
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  <strong>Strict Invariant:</strong> RepoMind PR Analyzer provides automated advisory guidance, risk scoring, and test recommendations for human engineers — it <strong>never auto-approves or auto-merges</strong>.
                </span>
              </div>

              {/* Preset Diff Selector */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-300">Select Sample PR Diff to Analyze</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSamplePrType("security");
                        setPrTitle("feat: rotate AES encryption key and update vault signature");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        samplePrType === "security"
                          ? "bg-rose-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      Crypto Vault Changes (High Risk)
                    </button>
                    <button
                      onClick={() => {
                        setSamplePrType("feature");
                        setPrTitle("docs: update formatting utility and readme");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        samplePrType === "feature"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      Format Utilities (Low Risk)
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-[11px] text-slate-400">PR Title</label>
                    <input
                      type="text"
                      value={prTitle}
                      onChange={(e) => setPrTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono mt-1"
                    />
                  </div>
                  <div className="w-44">
                    <label className="text-[11px] text-slate-400">Author</label>
                    <input
                      type="text"
                      value={prAuthor}
                      onChange={(e) => setPrAuthor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono mt-1"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAnalyzePR}
                  disabled={analyzingPr}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
                >
                  {analyzingPr ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <GitPullRequest className="w-3.5 h-3.5" />}
                  {analyzingPr ? "Evaluating Diff..." : "Run PR Analyzer"}
                </button>
              </div>

              {/* PR Analysis Results */}
              {prAnalysis && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Risk Badge Header */}
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      prAnalysis.riskLevel === "high"
                        ? "bg-rose-950/25 border-rose-500/40 text-rose-300"
                        : prAnalysis.riskLevel === "medium"
                          ? "bg-amber-950/25 border-amber-500/40 text-amber-300"
                          : "bg-emerald-950/25 border-emerald-500/40 text-emerald-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm uppercase">
                          Risk Rating: {prAnalysis.riskLevel}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-slate-900/60 border border-current">
                          Score: {prAnalysis.riskScore}/100
                        </span>
                      </div>
                      <p className="text-xs mt-1 text-slate-300">{prAnalysis.riskJustification}</p>
                    </div>
                  </div>

                  {/* Files Needing Human Review */}
                  {prAnalysis.filesNeedingHumanReview.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Files Requiring Focused Human Review
                      </h3>
                      <div className="space-y-2">
                        {prAnalysis.filesNeedingHumanReview.map((f, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3"
                          >
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-0.5 ${
                                f.priority === "high"
                                  ? "bg-rose-900/40 text-rose-400 border border-rose-800"
                                  : "bg-amber-900/40 text-amber-400 border border-amber-800"
                              }`}
                            >
                              {f.priority}
                            </span>
                            <div>
                              <div className="text-xs font-mono font-bold text-white">{f.file}</div>
                              <div className="text-xs text-slate-400 mt-0.5">{f.reason}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Checklist */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Engineer Review Checklist
                    </h3>
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                      {prAnalysis.reviewChecklist.map((item, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                          <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Tests */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Targeted Suggested Tests
                    </h3>
                    <div className="space-y-1">
                      {prAnalysis.suggestedTests.map((testCmd, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 flex items-center justify-between"
                        >
                          <span>{testCmd}</span>
                          <button
                            onClick={() => navigator.clipboard.writeText(testCmd)}
                            className="text-xs text-slate-500 hover:text-white px-2 py-0.5 rounded bg-slate-900"
                          >
                            Copy
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            RepoMind Intelligence Engine &bull; Phase 12 Architecture & Advisory Review
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
