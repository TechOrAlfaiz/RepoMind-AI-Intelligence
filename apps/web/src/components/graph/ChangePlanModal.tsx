import React, { useState } from "react";
import {
  Sparkles,
  X,
  AlertTriangle,
  FileCode,
  Send,
  RefreshCw,
  ListOrdered,
} from "lucide-react";
import type { ChangePlanResult, GraphNode } from "@repomind/shared-types";

interface ChangePlanModalProps {
  repoId: string;
  initialNode?: GraphNode | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCodeLine: (filePath: string) => void;
}

export const ChangePlanModal: React.FC<ChangePlanModalProps> = ({
  repoId,
  initialNode,
  isOpen,
  onClose,
  onOpenCodeLine,
}) => {
  const [prompt, setPrompt] = useState(
    initialNode
      ? `Refactor ${initialNode.name} to decouple business logic from external dependencies`
      : "Replace MongoDB data persistence with PostgreSQL"
  );
  const [plan, setPlan] = useState<ChangePlanResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/api/repos/${repoId}/change-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: prompt.trim(),
          targetEntities: initialNode ? [initialNode.path] : [],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPlan(data);
      }
    } catch (err) {
      console.error("Failed to generate change plan:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05080F]/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#0B101B] border border-[#1F293D] rounded-2xl w-full max-w-3xl max-h-[90vh] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#1F293D] flex items-center justify-between bg-[#080C14]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                AI Change Planner & Risk Roadmap
              </h2>
              <p className="text-[11px] text-slate-400">
                Architectural refactoring roadmap grounded in actual repository dependency graph.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[#162032] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Bar */}
        <form onSubmit={handleGeneratePlan} className="p-3.5 bg-[#080C14] border-b border-[#1F293D] flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the architectural change (e.g. 'Replace MongoDB with PostgreSQL')"
            className="flex-1 bg-[#0D1424] border border-[#1F293D] rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition font-sans"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50 flex-shrink-0 cursor-pointer shadow-sm shadow-indigo-600/20"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>Plan Change</span>
          </button>
        </form>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-mono">
                Mapping affected models, services, APIs, and tests across graph...
              </p>
            </div>
          ) : !plan ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Enter your planned architectural change above to generate a full impact and migration roadmap.
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-slate-200 leading-relaxed">
                <strong className="text-indigo-300 block mb-1">Architecture Summary:</strong>
                {plan.summary}
              </div>

              {/* Risk Areas */}
              <div className="space-y-2">
                <h3 className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Key Risk Areas</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {plan.riskAreas.map((ra, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#0D1424] border border-amber-500/20 space-y-1">
                      <strong className="text-xs text-slate-100 block font-semibold">{ra.area}</strong>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{ra.risk}</p>
                      <p className="text-[10px] text-emerald-400 font-medium pt-1">✓ {ra.mitigation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Files Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                {/* Files to Modify */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Files to Modify</span>
                    <span className="font-mono text-slate-500">{plan.filesToModify.length}</span>
                  </h3>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {plan.filesToModify.map((f, i) => (
                      <div
                        key={i}
                        onClick={() => onOpenCodeLine(f)}
                        className="p-2 rounded-lg bg-[#0D1424] border border-[#1F293D] text-[11px] font-mono text-slate-300 flex items-center justify-between cursor-pointer hover:border-rose-500/40 hover:bg-[#111A30] transition"
                      >
                        <span className="truncate">{f}</span>
                        <FileCode className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Files to Review */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Downstream to Review</span>
                    <span className="font-mono text-slate-500">{plan.filesToReview.length}</span>
                  </h3>
                  <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                    {plan.filesToReview.map((f, i) => (
                      <div
                        key={i}
                        onClick={() => onOpenCodeLine(f)}
                        className="p-2 rounded-lg bg-[#0D1424] border border-[#1F293D] text-[11px] font-mono text-slate-300 flex items-center justify-between cursor-pointer hover:border-amber-500/40 hover:bg-[#111A30] transition"
                      >
                        <span className="truncate">{f}</span>
                        <FileCode className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Migration Steps */}
              <div className="space-y-2.5">
                <h3 className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Step-by-Step Migration Phases</span>
                </h3>
                <div className="space-y-2">
                  {plan.migrationSteps.map((step, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#0D1424] border border-[#1F293D] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-200">{step.title}</span>
                        <span
                          className={`text-[9px] uppercase font-mono font-semibold px-2 py-0.5 rounded border ${
                            step.riskLevel === "high"
                              ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                              : step.riskLevel === "medium"
                              ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                              : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          }`}
                        >
                          {step.riskLevel} risk
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{step.description}</p>
                      <div className="text-[11px] text-cyan-300 font-mono bg-cyan-950/20 p-2 rounded-lg border border-cyan-500/20">
                        Action: {step.actionRequired}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1F293D] bg-[#080C14] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-[#162032] hover:bg-[#1E2C44] text-slate-200 text-xs font-medium border border-[#1F293D] transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
