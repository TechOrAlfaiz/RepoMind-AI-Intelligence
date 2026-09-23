import React, { useState, useEffect, useCallback } from "react";
import {
  Network,
  Bug,
  GitPullRequest,
  Search,
  RefreshCw,
  Sparkles,
  TrendingUp,
  CheckCircle,
  FileCode,
  ExternalLink,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  FolderTree,
} from "lucide-react";
import { useRepo } from "../../context/RepoContext";
import { RepoFileExplorer } from "../../components/shell/RepoFileExplorer";
import { InteractiveGraphCanvas } from "../../components/graph/InteractiveGraphCanvas";
import { NodeDetailsDrawer } from "../../components/graph/NodeDetailsDrawer";
import { ImpactAnalysisPanel } from "../../components/graph/ImpactAnalysisPanel";
import { WhyExistsModal } from "../../components/graph/WhyExistsModal";
import { ChangePlanModal } from "../../components/graph/ChangePlanModal";
import { CommandPalette } from "../../components/graph/CommandPalette";
import { RelationshipEdgeModal } from "../../components/graph/RelationshipEdgeModal";
import { ArchitectureTimelineBar } from "../../components/graph/ArchitectureTimelineBar";
import { CoChangeDrawer } from "../../components/graph/CoChangeDrawer";
import { CodeViewer } from "../../components/viewer/CodeViewer";
import type {
  ArchitectureGraph,
  GraphNode,
  GraphEdge,
  ImpactAnalysisResult,
  BugInvestigationResult,
  PullRequestAnalysis,
  FileRecord,
} from "@repomind/shared-types";

interface IntelligencePageProps {
  initialTab?: "architecture" | "bug" | "pr";
}

export const IntelligencePage: React.FC<IntelligencePageProps> = ({ initialTab = "architecture" }) => {
  const { repositories } = useRepo();
  const [activeTab, setActiveTab] = useState<"architecture" | "bug" | "pr">(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const [selectedRepoId, setSelectedRepoId] = useState<string>(repositories[0]?.id || "");

  // Panel Collapsible State for 3-Pane Flagship Workspace
  const [isLeftExplorerOpen, setIsLeftExplorerOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

  // Graph Data & Multi-Level / Direction Controls
  const [graph, setGraph] = useState<ArchitectureGraph | null>(null);
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [level, setLevel] = useState<1 | 2 | 3 | 4>(3);
  const [direction, setDirection] = useState<"both" | "upstream" | "downstream">("both");
  const [depth, setDepth] = useState<number>(1);

  // Active Selection & Filter State
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Timeline & Co-Change State
  const [activeSnapshotId, setActiveSnapshotId] = useState<string>("head");
  const [isCoChangeOpen, setIsCoChangeOpen] = useState(false);

  // Impact Analysis State
  const [impactTargetNode, setImpactTargetNode] = useState<GraphNode | null>(null);
  const [impactResult, setImpactResult] = useState<ImpactAnalysisResult | null>(null);
  const [loadingImpact, setLoadingImpact] = useState(false);
  const [isImpactPanelOpen, setIsImpactPanelOpen] = useState(false);

  // Bug Investigator State
  const [bugQuery, setBugQuery] = useState("JWT signature validation failure on expired token in auth flow");
  const [investigatingBug, setInvestigatingBug] = useState(false);
  const [bugResult, setBugResult] = useState<BugInvestigationResult | null>(null);

  // PR Analyzer State
  const [prTitle, setPrTitle] = useState("feat: rotate AES encryption key and update vault signature");
  const [prAuthor, setPrAuthor] = useState("dev-contributor");
  const [prChangedFiles, setPrChangedFiles] = useState("src/utils/crypto.ts, src/services/user.service.ts");
  const [prDiffDescription, setPrDiffDescription] = useState("Updates hashPassword algorithm and refactors user authentication checks");
  const [analyzingPr, setAnalyzingPr] = useState(false);
  const [prAnalysis, setPrAnalysis] = useState<PullRequestAnalysis | null>(null);

  // Modals & Drawers
  const [whyExistsNode, setWhyExistsNode] = useState<GraphNode | null>(null);
  const [changePlanNode, setChangePlanNode] = useState<GraphNode | null>(null);
  const [isChangePlanOpen, setIsChangePlanOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Monaco Code Viewer Overlay
  const [activeCodeSource, setActiveCodeSource] = useState<{
    filePath: string;
    startLine?: number;
    endLine?: number;
  } | null>(null);

  const fallbackRepo = {
    id: "repomind-core",
    organizationId: "org-default",
    githubRepoId: 999999,
    name: "repomind-core",
    fullName: "repomind/repomind-core",
    defaultBranch: "main",
    branch: "main",
    isPrivate: false,
    indexStatus: "indexed" as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const selectedRepo = repositories.find((r) => r.id === selectedRepoId) || repositories[0] || fallbackRepo;

  useEffect(() => {
    if (!selectedRepoId && (repositories[0]?.id || fallbackRepo.id)) {
      setSelectedRepoId(repositories[0]?.id || fallbackRepo.id);
    }
  }, [repositories, selectedRepoId]);

  // Fetch Graph
  const loadGraph = useCallback(
    async (refresh = false) => {
      if (!selectedRepo?.id) return;
      setLoadingGraph(true);
      try {
        const queryParams = new URLSearchParams({
          level: String(level),
          direction,
          depth: String(depth),
        });
        if (refresh) queryParams.set("refresh", "true");
        if (direction !== "both" && selectedNode?.id) {
          queryParams.set("focus", selectedNode.id);
        }

        const url = `/api/repos/${selectedRepo.id}/graph?${queryParams.toString()}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setGraph(data);
          // Auto-select first service or router if none selected
          if (!selectedNode && data.nodes?.length > 0) {
            const first = data.nodes.find((n: GraphNode) => n.type === "service" || n.type === "router") || data.nodes[0];
            setSelectedNode(first);
          }
        }
      } catch (e) {
        console.error("Failed to load architecture graph:", e);
      } finally {
        setLoadingGraph(false);
      }
    },
    [selectedRepo?.id, level, direction, depth, selectedNode?.id]
  );

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  // Global Keyboard Shortcuts (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Trigger Bug Investigation
  const handleInvestigateBug = async (overrideQuery?: string) => {
    const q = (overrideQuery || bugQuery).trim();
    if (!q || !selectedRepo?.id) return;
    setInvestigatingBug(true);
    try {
      const res = await fetch(`/api/repos/${selectedRepo.id}/investigate-bug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: q }),
      });
      if (res.ok) {
        const data = await res.json();
        setBugResult(data);
      }
    } catch (e) {
      console.error("Bug investigation failed:", e);
    } finally {
      setInvestigatingBug(false);
    }
  };

  // Trigger PR Advisory Analysis
  const handleAnalyzePr = async () => {
    if (!selectedRepo?.id) return;
    setAnalyzingPr(true);
    try {
      const changedFiles = prChangedFiles.split(",").map((f) => f.trim()).filter(Boolean);
      const res = await fetch(`/api/repos/${selectedRepo.id}/analyze-pr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          prNumber: 42,
          title: prTitle,
          author: prAuthor,
          changedFiles,
          diffDescription: prDiffDescription,
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
  };

  // Automatically trigger Bug Investigation if activeTab is "bug" and no result yet
  useEffect(() => {
    if (activeTab === "bug" && !bugResult && !investigatingBug && selectedRepo?.id) {
      handleInvestigateBug();
    }
  }, [activeTab, selectedRepo?.id]);

  // Trigger Impact Analysis for a target node
  const handleAnalyzeImpact = async (node: GraphNode, changeType = "modify") => {
    if (!selectedRepo?.id) return;
    setImpactTargetNode(node);
    setIsImpactPanelOpen(true);
    setLoadingImpact(true);

    try {
      const res = await fetch(`/api/repos/${selectedRepo.id}/impact-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId: node.id,
          changeType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setImpactResult(data);
      }
    } catch (e) {
      console.error("Impact analysis failed:", e);
    } finally {
      setLoadingImpact(false);
    }
  };

  const handleOpenCodeLine = (filePath: string, line?: number) => {
    setActiveCodeSource({
      filePath,
      startLine: line || 1,
      endLine: line ? line + 10 : 30,
    });
  };

  // Synchronize AST Graph Nodes with Repository File Explorer
  const explorerFiles: FileRecord[] = React.useMemo(() => {
    if (graph?.nodes && graph.nodes.length > 0) {
      return graph.nodes.map((n) => ({
        id: n.id,
        repositoryId: selectedRepo.id,
        path: n.path,
        language: n.language || (n.path.endsWith(".ts") || n.path.endsWith(".tsx") ? "typescript" : "javascript"),
        contentHash: `hash_${n.id}`,
        latestSha: "HEAD",
        size: (n.lines || 30) * 28,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }
    return [];
  }, [graph?.nodes, selectedRepo.id]);

  const handleSelectFileFromExplorer = (filePath: string) => {
    const matchingNode = graph?.nodes.find((n) => n.path === filePath || n.path.endsWith(filePath));
    if (matchingNode) {
      setSelectedNode(matchingNode);
      setIsRightPanelOpen(true);
      setIsImpactPanelOpen(false);
    } else {
      handleOpenCodeLine(filePath, 1);
    }
  };

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#080C14] text-slate-100 overflow-hidden font-sans">
      {/* Top Unified Flagship Command Bar */}
      <div className="h-14 border-b border-white/[0.08] bg-[#090D17]/95 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between gap-3 flex-shrink-0 z-30">
        {/* Left: Explorer Toggle & Architecture Brand / Repo Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          {activeTab === "architecture" && (
            <button
              onClick={() => setIsLeftExplorerOpen((prev) => !prev)}
              className={`p-1.5 rounded-lg text-xs font-mono border transition flex items-center gap-1.5 cursor-pointer ${
                isLeftExplorerOpen
                  ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                  : "bg-[#06090F] text-slate-400 border-white/[0.08] hover:text-white"
              }`}
              title={isLeftExplorerOpen ? "Hide File Explorer" : "Show File Explorer"}
            >
              {isLeftExplorerOpen ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeft className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Files</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
              <Network className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="font-bold text-xs tracking-tight text-white hidden md:inline">
              Architecture Graph
            </span>
          </div>

          {/* Repo Selector Pill */}
          <select
            value={selectedRepoId || selectedRepo.id}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="bg-[#0B101E] border border-white/[0.08] rounded-lg px-2 py-1 text-xs font-mono text-slate-200 outline-none cursor-pointer hover:border-indigo-500/40 transition"
          >
            {(repositories.length > 0 ? repositories : [fallbackRepo]).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.branch})
              </option>
            ))}
          </select>

          {/* Graph Metrics Badge */}
          {graph && (
            <div className="hidden xl:flex items-center gap-2 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-slate-400">
              <span>
                <strong className="text-white">{graph.metrics.totalNodes}</strong> nodes
              </span>
              <span className="text-slate-600">&bull;</span>
              <span>
                <strong className="text-indigo-400">{graph.metrics.totalEdges}</strong> edges
              </span>
            </div>
          )}
        </div>

        {/* Center: Search & Layer Filter Dropdown */}
        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center max-w-md px-2">
          {/* Quick Search Input */}
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter nodes... (Ctrl+K)"
              className="w-full bg-[#0B101E] border border-white/[0.08] rounded-lg pl-7 pr-3 py-1 text-[11px] font-mono text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition"
            />
            <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2 pointer-events-none" />
          </div>

          {/* Layer Filter Dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0B101E] border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] font-mono text-slate-300 outline-none cursor-pointer hover:border-indigo-500/40 transition shrink-0"
          >
            <option value="all">All Layers</option>
            <option value="router">API & Routers</option>
            <option value="service">Services</option>
            <option value="model">Models & DB</option>
            <option value="component">UI Components</option>
            <option value="test">Tests</option>
          </select>
        </div>

        {/* Right: View Level, AI Actions & Inspector Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View Level Segmented Switcher */}
          <div className="hidden md:flex items-center gap-0.5 bg-[#0B101E] p-0.5 rounded-lg border border-white/[0.06] text-[11px] font-mono">
            <button
              onClick={() => setLevel(2)}
              className={`px-2 py-0.5 rounded-md transition ${level === 2 ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}
            >
              Services
            </button>
            <button
              onClick={() => setLevel(3)}
              className={`px-2 py-0.5 rounded-md transition ${level === 3 ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}
            >
              Files
            </button>
            <button
              onClick={() => setLevel(4)}
              className={`px-2 py-0.5 rounded-md transition ${level === 4 ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"}`}
            >
              Symbols
            </button>
          </div>

          {/* Statistical Co-Change Drawer Toggle */}
          <button
            onClick={() => setIsCoChangeOpen((prev) => !prev)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isCoChangeOpen
                ? "bg-cyan-600/30 text-cyan-200 border-cyan-500/50"
                : "bg-[#0B101E] border-white/[0.08] text-slate-300 hover:text-white hover:border-cyan-500/30"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Co-Changes</span>
          </button>

          {/* Plan Change Button */}
          <button
            onClick={() => {
              setChangePlanNode(selectedNode);
              setIsChangePlanOpen(true);
            }}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plan Change</span>
          </button>

          {/* Details Inspector Panel Toggle */}
          {activeTab === "architecture" && (
            <button
              onClick={() => setIsRightPanelOpen((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                isRightPanelOpen
                  ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40"
                  : "bg-[#0B101E] border-white/[0.08] text-slate-400 hover:text-white"
              }`}
              title={isRightPanelOpen ? "Hide Inspector Panel" : "Show Inspector Panel"}
            >
              {isRightPanelOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
              <span className="text-xs font-mono hidden lg:inline">Inspector</span>
            </button>
          )}

          {/* Refresh Graph */}
          <button
            onClick={() => loadGraph(true)}
            disabled={loadingGraph}
            title="Refresh AST Graph"
            className="p-1.5 rounded-lg bg-[#0B101E] border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.05] transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingGraph ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      {activeTab === "architecture" ? (
        <div className="flex-1 flex overflow-hidden relative">
          {/* PANE 1: LEFT REPOSITORY EXPLORER */}
          {isLeftExplorerOpen && (
            <div className="w-64 sm:w-72 h-full bg-[#0B101B] border-r border-white/[0.08] flex flex-col shrink-0 z-20 transition-all duration-200">
              <div className="px-3 py-2 border-b border-white/[0.08] flex items-center justify-between bg-[#080C14]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 font-mono">
                  <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Repository Explorer</span>
                </div>
                <button
                  onClick={() => setIsLeftExplorerOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
                  title="Collapse Explorer"
                >
                  <PanelLeftClose className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <RepoFileExplorer
                  files={explorerFiles}
                  activeFilePath={selectedNode?.path || null}
                  loading={loadingGraph}
                  onSelectFile={handleSelectFileFromExplorer}
                  onRefresh={() => loadGraph(true)}
                />
              </div>
            </div>
          )}

          {/* PANE 2: CENTER INTERACTIVE DEPENDENCY GRAPH */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#080C14] relative">

            {/* Canvas Area & Timeline Bar */}
            <div className="flex-1 relative flex flex-col min-h-0">
              <div className="flex-1 relative">
                {loadingGraph && !graph ? (
                  <div className="h-full flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-400 font-mono">Parsing AST symbols & building dependency graph...</p>
                  </div>
                ) : (
                  <InteractiveGraphCanvas
                    nodes={graph?.nodes || []}
                    edges={graph?.edges || []}
                    selectedNodeId={selectedNode?.id || null}
                    impactResult={impactResult}
                    onSelectNode={(node) => {
                      setSelectedNode(node);
                      setIsRightPanelOpen(true);
                      setIsImpactPanelOpen(false);
                    }}
                    onSelectEdge={(edge) => setSelectedEdge(edge)}
                    filterType={filterType}
                    searchQuery={searchQuery}
                    level={level}
                    onChangeLevel={setLevel}
                    direction={direction}
                    onChangeDirection={setDirection}
                    depth={depth}
                    onChangeDepth={setDepth}
                  />
                )}
              </div>

              {/* Architecture Timeline Scrubber */}
              {selectedRepo && (
                <ArchitectureTimelineBar
                  repoId={selectedRepo.id}
                  activeSnapshotId={activeSnapshotId}
                  onSelectSnapshot={(snap) => {
                    setActiveSnapshotId(snap.id);
                    loadGraph(true);
                  }}
                />
              )}
            </div>
          </div>

          {/* Co-Change Drawer */}
          {isCoChangeOpen && selectedRepo && (
            <CoChangeDrawer
              repoId={selectedRepo.id}
              isOpen={isCoChangeOpen}
              onClose={() => setIsCoChangeOpen(false)}
              onSelectFile={(filePath) => handleOpenCodeLine(filePath)}
            />
          )}

          {/* PANE 3: RIGHT IMPACT DETAILS & NODE INSPECTOR */}
          {isRightPanelOpen && (isImpactPanelOpen || selectedNode) && (
            <div className="h-full shrink-0 z-20 flex flex-col">
              {isImpactPanelOpen && impactTargetNode ? (
                <ImpactAnalysisPanel
                  repoId={selectedRepo?.id || ""}
                  targetNode={impactTargetNode}
                  impactResult={impactResult}
                  loading={loadingImpact}
                  onClose={() => setIsImpactPanelOpen(false)}
                  onReanalyze={(ct) => handleAnalyzeImpact(impactTargetNode, ct)}
                  onOpenCodeLine={handleOpenCodeLine}
                  onFocusNode={(nodeId) => {
                    const target = graph?.nodes.find((n) => n.id === nodeId);
                    if (target) setSelectedNode(target);
                  }}
                />
              ) : selectedNode ? (
                <NodeDetailsDrawer
                  node={selectedNode}
                  edges={graph?.edges || []}
                  allNodes={graph?.nodes || []}
                  onClose={() => setSelectedNode(null)}
                  onAnalyzeImpact={(node) => handleAnalyzeImpact(node)}
                  onWhyExists={(node) => setWhyExistsNode(node)}
                  onOpenCode={(filePath, line) => handleOpenCodeLine(filePath, line)}
                  onFocusNode={(node) => setSelectedNode(node)}
                  onPlanChange={(node) => {
                    setChangePlanNode(node);
                    setIsChangePlanOpen(true);
                  }}
                />
              ) : null}
            </div>
          )}
        </div>
      ) : activeTab === "bug" ? (
        /* Dedicated In-Page Bug Root-Cause Investigator Workspace */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto space-y-6 w-full animate-in fade-in duration-200">
          {/* Header & Query Input Box */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-slate-950/80 border border-purple-500/20 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
                <Bug className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  Bug Root-Cause Investigator
                </h1>
                <p className="text-xs text-slate-400">
                  Correlate error logs and stack traces across AST codebase symbols, call hierarchies, and historical GitHub issues.
                </p>
              </div>
            </div>

            {/* Input Bar */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={bugQuery}
                    onChange={(e) => setBugQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleInvestigateBug()}
                    placeholder="Enter error message, stack trace, or bug symptom..."
                    className="w-full bg-slate-950/90 border border-white/[0.1] focus:border-purple-500 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none transition"
                  />
                  <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-3 pointer-events-none" />
                </div>

                <button
                  onClick={() => handleInvestigateBug()}
                  disabled={investigatingBug || !bugQuery.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-purple-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer flex-shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${investigatingBug ? "animate-spin" : ""}`} />
                  <span>{investigatingBug ? "Investigating..." : "Investigate Root Cause"}</span>
                </button>
              </div>

              {/* Sample Queries */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] pt-1">
                <span className="text-slate-500 font-medium">Quick Samples:</span>
                {[
                  "JWT signature validation failure on expired token in auth flow",
                  "Unhandled error during user password encryption",
                  "CORS preflight rejection on user routes endpoint",
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setBugQuery(sample);
                      handleInvestigateBug(sample);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/[0.06] text-slate-300 hover:text-purple-300 text-[10px] font-mono transition cursor-pointer"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Investigation Results */}
          {investigatingBug && !bugResult ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-9 h-9 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Correlating stack trace with AST symbols and historical issues...</p>
            </div>
          ) : bugResult ? (
            <div className="space-y-6">
              {/* Hypothesis & Fix Summary Card */}
              <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-3 shadow-xl">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Root Cause Hypothesis</span>
                  <span className="ml-auto text-[10px] font-mono text-slate-400 font-normal">
                    Diagnostics completed in {bugResult.latencyMs}ms
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {bugResult.rootCauseHypothesis}
                </p>
                <div className="pt-2 border-t border-purple-500/10 flex items-start gap-2 text-xs text-slate-300">
                  <strong className="text-purple-400 flex-shrink-0">Suggested Fix:</strong>
                  <span>{bugResult.suggestedFixSummary}</span>
                </div>
              </div>

              {/* Diagnostic Steps Checklist */}
              {bugResult.diagnosticSteps?.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-white/[0.08] space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Recommended Diagnostic Steps</span>
                  </h3>
                  <div className="space-y-2">
                    {bugResult.diagnosticSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suspected Code Locations */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                  <span>Suspected Code Locations ({bugResult.suspectedLocations.length})</span>
                  <span className="text-[10px] text-slate-500 font-normal">Click to jump into Monaco code viewer</span>
                </h3>

                <div className="grid grid-cols-1 gap-3">
                  {bugResult.suspectedLocations.map((loc, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-950/80 border border-white/[0.08] hover:border-purple-500/40 transition space-y-2.5 group"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => handleOpenCodeLine(loc.filePath, loc.startLine)}
                          className="font-mono text-xs font-bold text-purple-300 hover:text-purple-200 flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <FileCode className="w-3.5 h-3.5 text-purple-400" />
                          <span>{loc.filePath}:{loc.startLine}-{loc.endLine}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                        </button>

                        <div className="flex items-center gap-2">
                          {loc.symbolName && (
                            <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/[0.06] text-[10px] font-mono text-slate-300">
                              {loc.symbolName}
                            </span>
                          )}
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Match: {Math.round(loc.relevanceScore * 100)}%
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-400">{loc.rationale}</p>

                      {loc.snippet && (
                        <pre className="p-3 rounded-lg bg-slate-900 border border-white/[0.06] text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
                          {loc.snippet}
                        </pre>
                      )}

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => handleOpenCodeLine(loc.filePath, loc.startLine)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-[11px] font-medium text-purple-300 hover:text-white border border-white/[0.08] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <span>Open Line {loc.startLine} in Monaco Viewer</span>
                          <ExternalLink className="w-3 h-3 text-purple-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Similar Historical Issues */}
              {bugResult.similarIssues.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Correlated Historical Issues ({bugResult.similarIssues.length})
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bugResult.similarIssues.map((issue) => (
                      <div
                        key={issue.issueNumber}
                        className="p-3.5 rounded-xl bg-slate-950 border border-white/[0.08] space-y-2 hover:border-white/[0.15] transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-white truncate">
                            #{issue.issueNumber} {issue.title}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                              issue.state === "closed"
                                ? "bg-purple-900/30 text-purple-300 border border-purple-800/40"
                                : "bg-emerald-900/30 text-emerald-300 border border-emerald-800/40"
                            }`}
                          >
                            {issue.state}
                          </span>
                        </div>

                        {issue.resolutionNotes && (
                          <p className="text-[11px] text-slate-400 italic bg-slate-900/50 p-2 rounded border border-white/[0.04]">
                            {issue.resolutionNotes}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1">
                          <span>Similarity: {Math.round(issue.similarityScore * 100)}%</span>
                          {issue.linkedPrs?.length > 0 && (
                            <span className="text-purple-400">PR #{issue.linkedPrs.join(", #")}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        /* Dedicated In-Page PR Advisory Review Workspace */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto space-y-6 w-full animate-in fade-in duration-200">
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-950/80 border border-indigo-500/20 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <GitPullRequest className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  Automated PR Advisory Review
                </h1>
                <p className="text-xs text-slate-400">
                  Analyze pull request changes against codebase contracts, security implications, and affected call hierarchies.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">PR Title</label>
                <input
                  type="text"
                  value={prTitle}
                  onChange={(e) => setPrTitle(e.target.value)}
                  className="w-full bg-slate-950/90 border border-white/[0.1] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Author</label>
                <input
                  type="text"
                  value={prAuthor}
                  onChange={(e) => setPrAuthor(e.target.value)}
                  className="w-full bg-slate-950/90 border border-white/[0.1] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Changed Files (comma-separated)</label>
                <input
                  type="text"
                  value={prChangedFiles}
                  onChange={(e) => setPrChangedFiles(e.target.value)}
                  className="w-full bg-slate-950/90 border border-white/[0.1] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Diff Summary</label>
                <textarea
                  rows={2}
                  value={prDiffDescription}
                  onChange={(e) => setPrDiffDescription(e.target.value)}
                  className="w-full bg-slate-950/90 border border-white/[0.1] focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none resize-none"
                />
              </div>
            </div>

            <button
              onClick={handleAnalyzePr}
              disabled={analyzingPr}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${analyzingPr ? "animate-spin" : ""}`} />
              <span>{analyzingPr ? "Evaluating Pull Request..." : "Run PR Advisory Analysis"}</span>
            </button>
          </div>

          {/* PR Results */}
          {prAnalysis && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-white/[0.08] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Risk Assessment</span>
                  <strong className="text-base font-bold text-white capitalize">{prAnalysis.diffSummary}</strong>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold font-mono uppercase ${
                    prAnalysis.riskLevel === "high"
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      : prAnalysis.riskLevel === "medium"
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  }`}
                >
                  {prAnalysis.riskLevel} Risk
                </span>
              </div>

              {prAnalysis.reviewChecklist?.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-white/[0.08] space-y-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Human Review Checklist</h3>
                  <div className="space-y-1.5">
                    {prAnalysis.reviewChecklist.map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {prAnalysis.suggestedTests?.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-white/[0.08] space-y-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recommended Test Suites</h3>
                  <div className="space-y-1.5">
                    {prAnalysis.suggestedTests.map((t, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs font-mono text-indigo-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Code Viewer Slide-Over Drawer */}
      {activeCodeSource && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[600px] lg:w-[720px] bg-slate-900 border-l border-white/[0.1] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <CodeViewer
            repoId={selectedRepo?.id}
            repoFullName={selectedRepo?.fullName}
            source={{
              id: `citation_${activeCodeSource.filePath}`,
              label: activeCodeSource.filePath.split("/").pop() || "Source",
              sourceKey: activeCodeSource.filePath,
              filePath: activeCodeSource.filePath,
              startLine: activeCodeSource.startLine || 1,
              endLine: activeCodeSource.endLine || 30,
              symbolName: activeCodeSource.filePath.split("/").pop(),
              snippet: "",
            }}
            onClose={() => setActiveCodeSource(null)}
          />
        </div>
      )}

      {/* Why Does This Exist Modal */}
      {whyExistsNode && selectedRepo && (
        <WhyExistsModal
          repoId={selectedRepo.id}
          node={whyExistsNode}
          isOpen={Boolean(whyExistsNode)}
          onClose={() => setWhyExistsNode(null)}
          onOpenCodeLine={handleOpenCodeLine}
        />
      )}

      {/* Change Planner Modal */}
      {isChangePlanOpen && selectedRepo && (
        <ChangePlanModal
          repoId={selectedRepo.id}
          initialNode={changePlanNode}
          isOpen={isChangePlanOpen}
          onClose={() => setIsChangePlanOpen(false)}
          onOpenCodeLine={handleOpenCodeLine}
        />
      )}

      {/* Command Palette (Ctrl+K) */}
      <CommandPalette
        nodes={graph?.nodes || []}
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectNode={(node) => {
          setSelectedNode(node);
          setIsImpactPanelOpen(false);
        }}
        onAnalyzeImpact={(node) => handleAnalyzeImpact(node)}
        onWhyExists={(node) => setWhyExistsNode(node)}
        onOpenCode={(filePath) => handleOpenCodeLine(filePath)}
      />

      {/* Deterministic Relationship Edge Modal */}
      {selectedEdge && (
        <RelationshipEdgeModal
          edge={selectedEdge}
          nodes={graph?.nodes || []}
          isOpen={Boolean(selectedEdge)}
          onClose={() => setSelectedEdge(null)}
          onOpenCodeLine={handleOpenCodeLine}
        />
      )}
    </div>
  );
};
