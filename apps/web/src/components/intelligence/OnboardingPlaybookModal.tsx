import React, { useEffect, useState } from "react";
import type { Repository, OnboardingPlaybook } from "@repomind/shared-types";

interface OnboardingPlaybookModalProps {
  repo: Repository;
  onClose: () => void;
  onViewFile?: (filePath: string, startLine?: number, endLine?: number) => void;
}

export const OnboardingPlaybookModal: React.FC<OnboardingPlaybookModalProps> = ({
  repo,
  onClose,
  onViewFile,
}) => {
  const [playbook, setPlaybook] = useState<OnboardingPlaybook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPlaybook = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/repos/${repo.id}/playbook`);
        if (!res.ok) {
          throw new Error(`Failed to fetch onboarding playbook (${res.statusText})`);
        }
        const data = await res.json();
        if (isMounted) {
          setPlaybook(data);
          if (data.steps && data.steps.length > 0) {
            setActiveStep(data.steps[0].rank);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load playbook");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPlaybook();
    return () => {
      isMounted = false;
    };
  }, [repo.id]);

  const getPhaseBadge = (phase: string) => {
    switch (phase) {
      case "orientation":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
      case "entrypoint":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
      case "domain-model":
        return "bg-purple-500/20 text-purple-300 border-purple-500/30";
      case "business-logic":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      case "verification":
        return "bg-cyan-500/20 text-cyan-300 border-cyan-500/30";
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/70 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
              🗺️
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                Onboarding Playbook
                <span className="text-xs font-normal text-slate-400 px-2 py-0.5 rounded-full bg-slate-800">
                  {repo.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                AI-curated reading path with AST-guided checkpoints and time estimates
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm">Synthesizing codebase reading roadmap...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <span className="font-semibold">Error:</span> {error}
            </div>
          )}

          {playbook && !loading && (
            <>
              {/* Overview Card */}
              <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider mb-1">
                    Playbook Overview
                  </h3>
                  <p className="text-sm text-slate-300 max-w-xl">{playbook.summary}</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-900/80 px-4 py-3 rounded-lg border border-slate-800 shrink-0">
                  <div className="text-center">
                    <span className="text-xl font-bold text-white">{playbook.steps.length}</span>
                    <p className="text-[11px] text-slate-400">Reading Steps</p>
                  </div>
                  <div className="w-[1px] h-8 bg-slate-800"></div>
                  <div className="text-center">
                    <span className="text-xl font-bold text-indigo-400">
                      {playbook.totalEstimatedMinutes}m
                    </span>
                    <p className="text-[11px] text-slate-400">Est. Total Time</p>
                  </div>
                </div>
              </div>

              {/* Steps Roadmap */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Sequential Learning Sequence
                </h3>

                <div className="space-y-3">
                  {playbook.steps.map((step) => {
                    const isExpanded = activeStep === step.rank;
                    return (
                      <div
                        key={step.rank}
                        className={`rounded-xl border transition-all ${
                          isExpanded
                            ? "bg-slate-800/80 border-indigo-500/50 shadow-md"
                            : "bg-slate-800/30 border-slate-700/40 hover:bg-slate-800/60"
                        }`}
                      >
                        <div
                          className="p-4 flex items-center justify-between cursor-pointer"
                          onClick={() => setActiveStep(isExpanded ? null : step.rank)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-300">
                              {step.rank}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                                <span
                                  className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${getPhaseBadge(
                                    step.phase
                                  )}`}
                                >
                                  {step.phase}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                <span className="font-mono text-slate-300">{step.filePath}</span>
                                {step.startLine && step.endLine && (
                                  <span className="text-indigo-400 ml-1.5 font-mono">
                                    (L{step.startLine}–L{step.endLine})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-400 bg-slate-900/60 px-2 py-1 rounded border border-slate-800">
                              ⏱️ ~{step.estimatedMinutes}m
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onViewFile) {
                                  onViewFile(step.filePath, step.startLine, step.endLine);
                                }
                              }}
                              className="text-xs px-2.5 py-1 rounded bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/40 transition"
                            >
                              Inspect Code
                            </button>
                            <span className="text-xs text-slate-500">{isExpanded ? "▲" : "▼"}</span>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="px-4 pb-4 pt-2 border-t border-slate-700/40 space-y-3">
                            <div>
                              <span className="text-xs font-semibold text-slate-300">Reading Goal:</span>
                              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                                {step.readingGoal}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2 items-center text-xs">
                              {step.symbolName && (
                                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900/70 border border-slate-700 text-indigo-300 font-mono">
                                  Symbol: {step.symbolName}
                                </span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-semibold">
                                {step.importance}
                              </span>
                            </div>

                            {step.snippet && (
                              <div className="mt-2">
                                <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                                  <span>Anchor Code Snippet:</span>
                                  <span className="font-mono text-slate-500">
                                    L{step.startLine || 1}–L{step.endLine || 25}
                                  </span>
                                </div>
                                <pre className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-200 overflow-x-auto max-h-40 leading-relaxed">
                                  <code>{step.snippet}</code>
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 flex items-center justify-end bg-slate-950/40">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
