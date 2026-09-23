import React, { useState } from "react";
import {
  BarChart3,
  Sparkles,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import type { EvaluationBenchmarkResult, ScoringWeights } from "@repomind/shared-types";
import { useRepo } from "../../context/RepoContext";

interface EvaluationModalProps {
  repoId: string;
  repoName: string;
  onClose: () => void;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  vectorWeight: 0.45,
  keywordWeight: 0.25,
  symbolWeight: 0.15,
  pathWeight: 0.10,
  recencyWeight: 0.05,
};

export const EvaluationModal: React.FC<EvaluationModalProps> = ({
  repoId,
  repoName,
  onClose,
}) => {
  const { runEvaluationBenchmark } = useRepo();
  const [weights, setWeights] = useState<ScoringWeights>(DEFAULT_WEIGHTS);
  const [benchmarkResult, setBenchmarkResult] = useState<EvaluationBenchmarkResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showSliders, setShowSliders] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    const result = await runEvaluationBenchmark(repoId, weights);
    if (result) {
      setBenchmarkResult(result);
    }
    setIsRunning(false);
  };

  const handleResetWeights = () => {
    setWeights(DEFAULT_WEIGHTS);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Hybrid Retrieval &amp; Reranking Benchmark</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Phase 10 Evaluator
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates Recall@K, MRR, and latency comparing Dense-Only vs BM25-Only vs Fused Hybrid on {repoName}.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Action & Configuration Toolbar */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition flex items-center gap-2 cursor-pointer"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Evaluating 15 Retrieval Passes...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Execute Benchmark</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowSliders(!showSliders)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{showSliders ? "Hide Scoring Weights" : "Tune Scoring Weights"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span>α (Vec): {weights.vectorWeight}</span>
            <span>&bull;</span>
            <span>β (BM25): {weights.keywordWeight}</span>
            <span>&bull;</span>
            <span>γ (Sym): {weights.symbolWeight}</span>
            <span>&bull;</span>
            <span>δ (Path): {weights.pathWeight}</span>
          </div>
        </div>

        {/* Weights Tuner Accordion */}
        {showSliders && (
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                Multi-Factor Scoring Function: α·vector + β·keyword + γ·symbol + δ·path + ε·recency
              </span>
              <button
                onClick={handleResetWeights}
                className="text-[11px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  α Vector Weight ({weights.vectorWeight})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.vectorWeight}
                  onChange={(e) =>
                    setWeights({ ...weights, vectorWeight: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  β BM25 Weight ({weights.keywordWeight})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.keywordWeight}
                  onChange={(e) =>
                    setWeights({ ...weights, keywordWeight: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  γ Symbol Boost ({weights.symbolWeight})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.symbolWeight}
                  onChange={(e) =>
                    setWeights({ ...weights, symbolWeight: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  δ Path Boost ({weights.pathWeight})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.pathWeight}
                  onChange={(e) =>
                    setWeights({ ...weights, pathWeight: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  ε Recency Decay ({weights.recencyWeight})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={weights.recencyWeight}
                  onChange={(e) =>
                    setWeights({ ...weights, recencyWeight: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Modal Content Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {!benchmarkResult ? (
            <div className="text-center py-16 text-slate-500 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                <BarChart3 className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-semibold text-slate-300">No Benchmark Run Yet</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Click <strong>"Execute Benchmark"</strong> to run our automated test cases against
                the repository and evaluate information retrieval quality metrics.
              </p>
            </div>
          ) : (
            <>
              {/* Comparative Metrics Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Comparative Performance Metrics
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Dense Only */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-300">Dense Vector (α=1.0)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Embedding Only
                      </span>
                    </div>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recall@1:</span>
                        <span className="font-semibold text-slate-200">
                          {(benchmarkResult.denseMetrics.recallAt1 * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recall@5:</span>
                        <span className="font-semibold text-slate-200">
                          {(benchmarkResult.denseMetrics.recallAt5 * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">MRR:</span>
                        <span className="font-semibold text-slate-200">
                          {benchmarkResult.denseMetrics.mrr.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                        <span>Avg Latency:</span>
                        <span>{benchmarkResult.denseMetrics.latencyMs}ms</span>
                      </div>
                    </div>
                  </div>

                  {/* BM25 Only */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-300">BM25 Sparse (β=1.0)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Keyword Only
                      </span>
                    </div>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recall@1:</span>
                        <span className="font-semibold text-slate-200">
                          {(benchmarkResult.bm25Metrics.recallAt1 * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recall@5:</span>
                        <span className="font-semibold text-slate-200">
                          {(benchmarkResult.bm25Metrics.recallAt5 * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">MRR:</span>
                        <span className="font-semibold text-slate-200">
                          {benchmarkResult.bm25Metrics.mrr.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                        <span>Avg Latency:</span>
                        <span>{benchmarkResult.bm25Metrics.latencyMs}ms</span>
                      </div>
                    </div>
                  </div>

                  {/* Fused Hybrid Reranked */}
                  <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/40 shadow-lg shadow-indigo-950/30">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-indigo-300">Fused Hybrid (Reranked)</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Optimal
                      </span>
                    </div>
                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recall@1:</span>
                        <span className="font-bold text-emerald-400">
                          {(benchmarkResult.hybridMetrics.recallAt1 * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Recall@5:</span>
                        <span className="font-bold text-emerald-400">
                          {(benchmarkResult.hybridMetrics.recallAt5 * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">MRR:</span>
                        <span className="font-bold text-emerald-400">
                          {benchmarkResult.hybridMetrics.mrr.toFixed(3)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                        <span>Avg Latency:</span>
                        <span>{benchmarkResult.hybridMetrics.latencyMs}ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Case-by-Case Breakdown Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Ground-Truth Test Cases ({benchmarkResult.cases.length})
                </h4>
                <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-medium">
                      <tr>
                        <th className="p-3">Query</th>
                        <th className="p-3">Expected Ground-Truth</th>
                        <th className="p-3">Retrieved Top 1</th>
                        <th className="p-3 text-center">Rank</th>
                        <th className="p-3 text-right">Final Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
                      {benchmarkResult.cases.map((c) => (
                        <tr key={c.caseId} className="hover:bg-slate-900/40 transition">
                          <td className="p-3 text-slate-200 font-sans font-medium max-w-xs">
                            {c.question}
                          </td>
                          <td className="p-3 text-indigo-300">
                            {c.expectedEvidence}
                          </td>
                          <td className="p-3 text-slate-300">
                            {c.retrievedTop1}
                          </td>
                          <td className="p-3 text-center">
                            {c.matched ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                #{c.rankInHybrid}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-400">
                                <XCircle className="w-3.5 h-3.5" />
                                Miss
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-200">
                            {(c.finalScore * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/60 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Multi-tenant isolated &bull; Pure deterministic TypeScript</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
