import React, { useState } from "react";
import {
  Zap,
  X,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Send,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import type {
  ImpactAnalysisResult,
  GraphNode,
} from "@repomind/shared-types";

interface ImpactAnalysisPanelProps {
  repoId: string;
  targetNode: GraphNode;
  impactResult: ImpactAnalysisResult | null;
  loading: boolean;
  onClose: () => void;
  onReanalyze: (changeType: string) => void;
  onOpenCodeLine: (filePath: string, line?: number) => void;
  onFocusNode: (nodeId: string) => void;
}

export const ImpactAnalysisPanel: React.FC<ImpactAnalysisPanelProps> = ({
  repoId,
  targetNode,
  impactResult,
  loading,
  onClose,
  onReanalyze,
  onOpenCodeLine,
  onFocusNode,
}) => {
  const [changeType, setChangeType] = useState<string>("modify");
  const [chatQuery, setChatQuery] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResponse, setChatResponse] = useState<string | null>(null);

  const handleRunImpactChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatQuery.trim() || chatLoading) return;

    setChatLoading(true);
    setChatResponse(null);

    try {
      const res = await fetch(`http://localhost:4000/api/repos/${repoId}/impact-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: chatQuery.trim(),
          targetNodeId: targetNode.id,
          changeType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setChatResponse(data.answer);
      } else {
        setChatResponse("Failed to generate impact explanation. Please retry.");
      }
    } catch (err: any) {
      setChatResponse(`Error: ${err.message}`);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="w-80 sm:w-[400px] h-full bg-[#0B101B] border-l border-white/[0.08] flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-150 select-none">
      {/* 1. Header */}
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between bg-[#080C14]/90 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
            <Zap className="w-3.5 h-3.5 fill-current" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5 font-mono">
              <span>Change Blast Radius</span>
            </h2>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              Target: <span className="text-indigo-300 font-semibold">{targetNode.name}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition"
          title="Close panel"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Change Type Selector Bar */}
      <div className="px-3.5 py-2 bg-[#06090F] border-b border-white/[0.05] flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400 uppercase font-mono font-medium">Type:</span>
        <select
          value={changeType}
          onChange={(e) => {
            const next = e.target.value;
            setChangeType(next);
            onReanalyze(next);
          }}
          className="bg-[#0B101B] border border-white/[0.1] rounded-md px-2 py-1 text-xs text-slate-200 font-mono outline-none cursor-pointer hover:border-indigo-500/50 transition flex-1"
        >
          <option value="modify">modify (Code Mutation)</option>
          <option value="delete">delete (Module Removal)</option>
          <option value="rename">rename (Path / Refactor)</option>
          <option value="refactor">refactor (Signature Break)</option>
          <option value="API_CHANGE">API_CHANGE (HTTP Endpoint)</option>
          <option value="DATABASE_CHANGE">DATABASE_CHANGE (Schema)</option>
        </select>
        <button
          onClick={() => onReanalyze(changeType)}
          disabled={loading}
          title="Recalculate Blast Radius"
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/[0.05] transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
        </button>
      </div>

      {/* 3. Main Body */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3">
          <div className="w-7 h-7 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Computing reverse dependency closure...</p>
        </div>
      ) : !impactResult ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center text-xs text-slate-400 font-mono">
          Click "Analyze Change Impact" to compute blast radius.
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
          {/* Executive Summary Cards */}
          <div className="grid grid-cols-4 gap-1.5">
            <div className="p-2 rounded-lg bg-[#06090F] border border-white/[0.05] text-center">
              <span className="text-[9px] text-slate-500 block uppercase font-mono">Affected</span>
              <strong className="text-xs font-bold text-white font-mono">
                {impactResult.totalAffected}
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-[#06090F] border border-red-500/20 text-center">
              <span className="text-[9px] text-red-400/80 block uppercase font-mono">High Risk</span>
              <strong className="text-xs font-bold text-red-400 font-mono">
                {impactResult.directAffectedCount}
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-[#06090F] border border-cyan-500/20 text-center">
              <span className="text-[9px] text-cyan-400/80 block uppercase font-mono">APIs</span>
              <strong className="text-xs font-bold text-cyan-400 font-mono">
                {impactResult.impactedApisCount}
              </strong>
            </div>
            <div className="p-2 rounded-lg bg-[#06090F] border border-emerald-500/20 text-center">
              <span className="text-[9px] text-emerald-400/80 block uppercase font-mono">Tests</span>
              <strong className="text-xs font-bold text-emerald-400 font-mono">
                {impactResult.impactedTestsCount}
              </strong>
            </div>
          </div>

          {/* TIER 1: HIGH IMPACT (Direct Callers & Importers) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-red-400 uppercase tracking-wider font-mono">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>High Impact ({impactResult.highImpact.length})</span>
              </span>
              <span className="text-[9px] font-normal text-slate-500 font-mono">Direct Callers</span>
            </div>

            {impactResult.highImpact.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-2 bg-[#06090F] rounded-lg border border-white/[0.04]">
                No direct high-impact consumers identified.
              </p>
            ) : (
              <div className="space-y-1.5">
                {impactResult.highImpact.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg bg-[#06090F] border border-red-500/25 space-y-1.5 hover:border-red-500/40 transition"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onFocusNode(item.id)}
                        className="font-mono text-xs font-bold text-white hover:text-red-300 transition truncate text-left"
                      >
                        {item.name}
                      </button>
                      <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300">
                        {item.relationship}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">{item.reason}</p>

                    {/* Evidence Snippets with Monaco Jump */}
                    {item.evidences.map((ev, idx) => (
                      <div
                        key={idx}
                        onClick={() => onOpenCodeLine(ev.sourceFile, ev.sourceLine)}
                        className="p-1.5 rounded bg-[#0B101B] border border-white/[0.06] text-[10px] font-mono text-slate-400 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition"
                      >
                        <span className="truncate">
                          Evidence: <span className="text-red-300 font-semibold">{ev.sourceFile.split("/").pop()}</span>
                          {ev.sourceLine ? `:${ev.sourceLine}` : ""}
                        </span>
                        <ExternalLink className="w-3 h-3 text-slate-500 flex-shrink-0 ml-1.5" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TIER 2: MEDIUM IMPACT (2-Hop Transitive) */}
          {impactResult.mediumImpact.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Medium Impact ({impactResult.mediumImpact.length})</span>
                </span>
                <span className="text-[9px] font-normal text-slate-500 font-mono">2-Hop Transitive</span>
              </div>

              <div className="space-y-1">
                {impactResult.mediumImpact.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 rounded-lg bg-[#06090F] border border-amber-500/20 space-y-1 hover:border-amber-500/35 transition"
                  >
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => onFocusNode(item.id)}
                        className="font-mono text-xs font-bold text-slate-200 hover:text-amber-300 transition truncate text-left"
                      >
                        {item.name}
                      </button>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        {item.relationship}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-sans">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RECOMMENDED VALIDATION CHECKLIST */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recommended Validation</span>
            </h3>
            <div className="space-y-1">
              {impactResult.recommendedValidations.map((step, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-[#06090F] border border-emerald-500/20 text-xs text-emerald-200 flex items-start gap-2"
                >
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span className="font-sans leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ASK IMPACT AI ASSISTANT */}
          <div className="p-3 rounded-xl bg-[#06090F] border border-indigo-500/30 space-y-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <h4 className="text-xs font-bold text-white font-mono">Ask Impact AI</h4>
            </div>

            <form onSubmit={handleRunImpactChat} className="space-y-2">
              <textarea
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                placeholder={`e.g. "What breaks if I change the return type in ${targetNode.name}?"`}
                rows={2}
                className="w-full bg-[#0B101B] border border-white/[0.1] rounded-lg p-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 resize-none font-sans"
              />
              <button
                type="submit"
                disabled={chatLoading || !chatQuery.trim()}
                className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
              >
                {chatLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Evaluate Impact</span>
              </button>
            </form>

            {chatResponse && (
              <div className="p-2.5 rounded-lg bg-[#0B101B] border border-white/[0.08] text-xs text-slate-300 space-y-1.5 animate-in fade-in duration-150">
                <div className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider font-mono">
                  Architectural Synthesis
                </div>
                <div className="whitespace-pre-wrap leading-relaxed font-sans">{chatResponse}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
