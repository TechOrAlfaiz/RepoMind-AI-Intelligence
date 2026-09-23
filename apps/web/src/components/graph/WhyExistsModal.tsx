import React, { useState, useEffect } from "react";
import {
  History,
  X,
  GitCommit,
  GitPullRequest,
  User,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import type { WhyExistsResult, GraphNode } from "@repomind/shared-types";

interface WhyExistsModalProps {
  repoId: string;
  node: GraphNode;
  isOpen: boolean;
  onClose: () => void;
  onOpenCodeLine: (filePath: string) => void;
}

export const WhyExistsModal: React.FC<WhyExistsModalProps> = ({
  repoId,
  node,
  isOpen,
  onClose,
  onOpenCodeLine,
}) => {
  const [data, setData] = useState<WhyExistsResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch(`http://localhost:4000/api/repos/${repoId}/why-exists/${node.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => {
        setData(result);
      })
      .catch((err) => {
        console.error("Failed to query code history:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, repoId, node.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05080F]/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#0B101B] border border-[#1F293D] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#1F293D] flex items-center justify-between bg-[#080C14]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Why Does This Code Exist?
              </h2>
              <p className="text-[11px] text-slate-400 font-mono truncate max-w-md">{node.path}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-[#162032] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-mono">Inspecting git commits and PR archaeology...</p>
            </div>
          ) : !data ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No historical evidence was found for this module.
            </div>
          ) : (
            <>
              {/* Primary Reason Callout */}
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 space-y-1">
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                  Primary Architectural Reason
                </span>
                <p className="text-xs font-medium text-slate-200 leading-relaxed">{data.reason}</p>
              </div>

              {/* Commit & PR Cards */}
              <div className="grid grid-cols-2 gap-3">
                {data.introducedCommit && (
                  <div className="p-3 rounded-xl bg-[#0D1424] border border-[#1F293D] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <GitCommit className="w-3.5 h-3.5 text-purple-400" />
                      <span>Introduced In Commit</span>
                    </div>
                    <div className="font-mono text-[11px] text-indigo-300 font-medium">
                      {data.introducedCommit.sha}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                      "{data.introducedCommit.message}"
                    </p>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
                      <User className="w-3 h-3" />
                      <span>{data.introducedCommit.author}</span>
                    </div>
                  </div>
                )}

                {data.relatedPr && (
                  <div className="p-3 rounded-xl bg-[#0D1424] border border-[#1F293D] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                      <GitPullRequest className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Related Pull Request</span>
                    </div>
                    <div className="font-mono text-[11px] text-emerald-400 font-medium">
                      #{data.relatedPr.number}
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">{data.relatedPr.title}</p>
                    <div className="text-[10px] text-emerald-400/90 flex items-center gap-1 pt-0.5 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Merged to Main</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Historical Context */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Historical Context
                </span>
                <p className="text-xs text-slate-300 bg-[#0D1424] p-3 rounded-xl border border-[#1F293D] leading-relaxed">
                  {data.historicalContext}
                </p>
              </div>

              {/* Grounded Evidence Badges */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Historical Evidence
                </span>
                <div className="space-y-1">
                  {data.evidence.map((ev, i) => (
                    <div
                      key={i}
                      onClick={() => onOpenCodeLine(ev.file)}
                      className="p-2 rounded-lg bg-[#0D1424] border border-[#1F293D] text-[11px] font-mono text-slate-300 flex items-center justify-between cursor-pointer hover:border-indigo-500/50 hover:bg-[#111A30] transition"
                    >
                      <span>
                        {ev.file} {ev.lineRange ? `(${ev.lineRange})` : ""} —{" "}
                        <span className="text-indigo-400">{ev.reference}</span>
                      </span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#1F293D] bg-[#080C14] flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px] text-slate-400 italic">Grounded in repository Git history — zero fabrication.</span>
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
