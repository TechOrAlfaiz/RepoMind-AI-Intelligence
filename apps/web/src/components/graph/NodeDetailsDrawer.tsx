import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Zap,
  History,
  FileCode,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  MessageSquare,
  Radio,
  TestTube,
  GitCommit,
  ExternalLink,
} from "lucide-react";
import type { GraphNode, GraphEdge } from "@repomind/shared-types";

interface NodeDetailsDrawerProps {
  node: GraphNode | null;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
  onAnalyzeImpact: (node: GraphNode) => void;
  onWhyExists: (node: GraphNode) => void;
  onOpenCode: (filePath: string, line?: number) => void;
  onFocusNode: (node: GraphNode) => void;
  onPlanChange: (node: GraphNode) => void;
  onAskRepoMind?: (query: string) => void;
}

export const NodeDetailsDrawer: React.FC<NodeDetailsDrawerProps> = ({
  node,
  edges,
  allNodes,
  onClose,
  onAnalyzeImpact,
  onWhyExists,
  onOpenCode,
  onFocusNode,
  onPlanChange,
  onAskRepoMind,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "deps" | "apis" | "history">("overview");

  if (!node) return null;

  const handleCopyPath = () => {
    navigator.clipboard.writeText(node.path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find direct dependencies (what this node imports / calls - Outbound)
  const directDependencies = edges
    .filter((e) => e.source === node.id)
    .map((e) => ({
      edge: e,
      targetNode: allNodes.find((n) => n.id === e.target),
    }))
    .filter((item) => item.targetNode !== undefined);

  // Find direct dependents (what imports / calls this node - Inbound)
  const directDependents = edges
    .filter((e) => e.target === node.id)
    .map((e) => ({
      edge: e,
      sourceNode: allNodes.find((n) => n.id === e.source),
    }))
    .filter((item) => item.sourceNode !== undefined);

  // Filter dedicated tests
  const testEdges = edges.filter(
    (e) => (e.target === node.id || e.source === node.id) && e.type === "TESTS"
  );
  const dedicatedTests = testEdges
    .map((e) => allNodes.find((n) => n.id === (e.source === node.id ? e.target : e.source)))
    .filter(Boolean);

  // Filter API endpoints
  const apiEdges = edges.filter(
    (e) => (e.source === node.id || e.target === node.id) && (e.type === "API_CALLS" || e.type === "API_HANDLED_BY")
  );

  return (
    <div className="w-80 sm:w-[380px] h-full bg-[#0B101B] border-l border-white/[0.08] flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-150 select-none">
      {/* 1. Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-[#080C14]/90 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] shrink-0" />
          <h2 className="text-xs font-bold text-white font-mono truncate">{node.name}</h2>
          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono shrink-0">
            {node.type}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
          title="Close details"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. File Path & Copy Bar */}
      <div className="px-4 py-2 bg-[#06090F] border-b border-white/[0.05] flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-slate-400 truncate">{node.path}</span>
        <button
          onClick={handleCopyPath}
          title="Copy file path"
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/[0.05] transition shrink-0"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
      </div>

      {/* 3. Primary Action Bar */}
      <div className="p-3 border-b border-white/[0.07] space-y-2 bg-[#080C14]/60">
        <button
          onClick={() => onAnalyzeImpact(node)}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-500/25 cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 text-cyan-200 fill-current" />
          <span>Analyze Change Impact</span>
        </button>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onOpenCode(node.path, 1)}
            className="py-1.5 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/[0.08] transition cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Code</span>
          </button>
          <button
            onClick={() => onWhyExists(node)}
            className="py-1.5 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/[0.08] transition cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            <span>Why Exists?</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onPlanChange(node)}
            className="py-1.5 px-2 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-indigo-500/30 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Plan Change</span>
          </button>
          <button
            onClick={() => onAskRepoMind?.(`Explain the role and architecture of ${node.name} (${node.path})`)}
            className="py-1.5 px-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-white/[0.08] transition cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ask RepoMind</span>
          </button>
        </div>
      </div>

      {/* 4. Tab Navigation */}
      <div className="px-3 pt-2 bg-[#080C14] border-b border-white/[0.06] flex items-center gap-1">
        {(
          [
            { id: "overview", label: "Overview" },
            { id: "deps", label: `Deps (${directDependencies.length + directDependents.length})` },
            { id: "apis", label: "APIs & Tests" },
            { id: "history", label: "History" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-2.5 py-1.5 text-xs font-medium border-b-2 transition cursor-pointer ${
              activeTab === tab.id
                ? "border-indigo-500 text-white font-semibold"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 5. Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-1.5">
              <div className="p-2 rounded-lg bg-[#06090F] border border-white/[0.05] text-center">
                <span className="text-[9px] text-slate-500 block uppercase font-mono">Lines</span>
                <strong className="text-xs font-bold text-white font-mono">{node.lines}</strong>
              </div>
              <div className="p-2 rounded-lg bg-[#06090F] border border-white/[0.05] text-center">
                <span className="text-[9px] text-slate-500 block uppercase font-mono">Used By</span>
                <strong className="text-xs font-bold text-emerald-400 font-mono">{node.inDegree}</strong>
              </div>
              <div className="p-2 rounded-lg bg-[#06090F] border border-white/[0.05] text-center">
                <span className="text-[9px] text-slate-500 block uppercase font-mono">Deps</span>
                <strong className="text-xs font-bold text-indigo-400 font-mono">{node.outDegree}</strong>
              </div>
              <div className="p-2 rounded-lg bg-[#06090F] border border-white/[0.05] text-center">
                <span className="text-[9px] text-slate-500 block uppercase font-mono">Exports</span>
                <strong className="text-xs font-bold text-cyan-400 font-mono">{node.exports?.length || 0}</strong>
              </div>
            </div>

            {/* Scope / Description */}
            {node.description && (
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Scope & Role
                </h3>
                <p className="text-slate-300 bg-[#06090F] p-2.5 rounded-lg border border-white/[0.05] leading-relaxed">
                  {node.description}
                </p>
              </div>
            )}

            {/* Exported Symbols */}
            {node.symbols && node.symbols.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>Exported AST Symbols</span>
                  <span className="text-slate-500 font-mono">{node.symbols.length}</span>
                </h3>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {node.symbols.map((sym) => (
                    <div
                      key={sym.id}
                      onClick={() => onOpenCode(node.path, sym.startLine)}
                      className="p-2 rounded-lg bg-[#06090F] hover:bg-white/[0.04] border border-white/[0.05] flex items-center justify-between cursor-pointer transition group"
                    >
                      <span className="text-slate-200 font-mono font-medium group-hover:text-indigo-300 truncate">
                        {sym.name}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">
                        L{sym.startLine}-{sym.endLine}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "deps" && (
          <div className="space-y-4">
            {/* Direct Dependencies (Outbound) */}
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3 text-indigo-400" />
                  <span>Outbound Dependencies</span>
                </span>
                <span className="text-slate-500 font-mono">{directDependencies.length}</span>
              </h3>

              {directDependencies.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic p-2 bg-[#06090F] rounded-lg border border-white/[0.04]">
                  No outbound internal dependencies.
                </p>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {directDependencies.map(({ edge, targetNode }) => (
                    <button
                      key={`${edge.source}->${edge.target}`}
                      onClick={() => targetNode && onFocusNode(targetNode)}
                      className="w-full p-2 rounded-lg bg-[#06090F] hover:bg-white/[0.04] border border-white/[0.05] flex items-center justify-between text-left transition group"
                    >
                      <span className="font-mono text-slate-300 group-hover:text-indigo-300 truncate">
                        {targetNode?.name}
                      </span>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 ml-2">
                        {edge.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Direct Dependents (Inbound / Blast Radius) */}
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                  <span>Inbound Dependents (Direct Callers)</span>
                </span>
                <span className="text-slate-500 font-mono">{directDependents.length}</span>
              </h3>

              {directDependents.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic p-2 bg-[#06090F] rounded-lg border border-white/[0.04]">
                  No other internal modules directly import this file.
                </p>
              ) : (
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {directDependents.map(({ edge, sourceNode }) => (
                    <button
                      key={`${edge.source}->${edge.target}`}
                      onClick={() => sourceNode && onFocusNode(sourceNode)}
                      className="w-full p-2 rounded-lg bg-[#06090F] hover:bg-white/[0.04] border border-white/[0.05] flex items-center justify-between text-left transition group"
                    >
                      <span className="font-mono text-slate-300 group-hover:text-emerald-300 truncate">
                        {sourceNode?.name}
                      </span>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0 ml-2">
                        {edge.type}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "apis" && (
          <div className="space-y-4">
            {/* Dedicated Tests */}
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <TestTube className="w-3 h-3 text-emerald-400" />
                  <span>Dedicated Tests</span>
                </span>
                <span className="text-slate-500 font-mono">{dedicatedTests.length}</span>
              </h3>

              {dedicatedTests.length === 0 ? (
                <div className="p-2.5 rounded-lg bg-[#06090F] border border-amber-500/20 text-amber-300/80 text-[11px]">
                  No dedicated test suite identified for this file. Recommended to add test coverage.
                </div>
              ) : (
                <div className="space-y-1">
                  {dedicatedTests.map((tNode) => (
                    <button
                      key={tNode?.id}
                      onClick={() => tNode && onOpenCode(tNode.path, 1)}
                      className="w-full p-2 rounded-lg bg-[#06090F] hover:bg-white/[0.04] border border-emerald-500/20 text-emerald-300 flex items-center justify-between text-left transition"
                    >
                      <span className="font-mono truncate">{tNode?.name}</span>
                      <ExternalLink className="w-3 h-3 shrink-0 ml-2 text-slate-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* API Endpoints */}
            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Radio className="w-3 h-3 text-cyan-400" />
                  <span>API Relationships</span>
                </span>
                <span className="text-slate-500 font-mono">{apiEdges.length}</span>
              </h3>

              {apiEdges.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic p-2 bg-[#06090F] rounded-lg border border-white/[0.04]">
                  No external HTTP route handlers directly declared in this module.
                </p>
              ) : (
                <div className="space-y-1">
                  {apiEdges.map((e) => (
                    <div
                      key={`${e.source}->${e.target}`}
                      className="p-2 rounded-lg bg-[#06090F] border border-cyan-500/20 text-cyan-300 flex items-center justify-between"
                    >
                      <span className="font-mono truncate">{e.evidence?.sourceSnippet || e.type}</span>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400">
                        Route
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-[#06090F] border border-white/[0.06] space-y-2">
              <div className="flex items-center gap-2">
                <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-mono text-xs font-bold text-white">Repository Invariants</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Deterministic AST relationship history parsed from repository HEAD.
              </p>
              <button
                onClick={() => onWhyExists(node)}
                className="w-full py-1.5 px-2 rounded bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Explain Why This Exists</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
