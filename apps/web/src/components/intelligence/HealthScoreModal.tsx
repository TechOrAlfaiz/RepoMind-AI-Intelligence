import { useState, useEffect } from "react";
import { X, Activity, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import type { RepoHealthScore, Repository } from "@repomind/shared-types";

interface HealthScoreModalProps {
  repo: Repository;
  isOpen?: boolean;
  onClose: () => void;
}

export function HealthScoreModal({ repo, isOpen = true, onClose }: HealthScoreModalProps) {
  const [health, setHealth] = useState<RepoHealthScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repos/${repo.id}/health`);
      if (!res.ok) {
        throw new Error(`Failed to load health score (HTTP ${res.status})`);
      }
      const data = await res.json();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || "Failed to load health score");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
    }
  }, [isOpen, repo.id]);

  if (!isOpen) return null;

  const getGradeBadge = (grade: string) => {
    switch (grade) {
      case "A":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 ring-emerald-500/20";
      case "B":
        return "bg-blue-500/10 text-blue-400 border-blue-500/30 ring-blue-500/20";
      case "C":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30 ring-amber-500/20";
      default:
        return "bg-rose-500/10 text-rose-400 border-rose-500/30 ring-rose-500/20";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Repository Health Score
                <span className="text-xs font-mono font-normal text-slate-400">({repo.name})</span>
              </h2>
              <p className="text-xs text-slate-400">Automated composite analysis from tests, docs, dependencies & churn</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
              title="Recalculate Health"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && !health ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Analyzing repository quality heuristics...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          ) : health ? (
            <>
              {/* Overall Score Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">Overall Quality Index</div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-extrabold text-white tracking-tight">{health.overallScore}</span>
                    <span className="text-sm text-slate-400 font-medium">/ 100</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Calculated across {health.fileStats.totalFiles} indexed repository files</p>
                </div>
                <div className={`text-3xl font-black px-5 py-2.5 rounded-2xl border ring-4 shadow-lg ${getGradeBadge(health.grade)}`}>
                  GRADE {health.grade}
                </div>
              </div>

              {/* Four Core Metrics Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Test Coverage */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Test Coverage</span>
                    <span className="font-bold text-emerald-400">{health.metrics.testCoverage.score}/100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${health.metrics.testCoverage.score}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{health.metrics.testCoverage.summary}</p>
                </div>

                {/* Documentation */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Doc Completeness</span>
                    <span className="font-bold text-cyan-400">{health.metrics.docCoverage.score}/100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full transition-all duration-500" style={{ width: `${health.metrics.docCoverage.score}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{health.metrics.docCoverage.summary}</p>
                </div>

                {/* Dependency Freshness */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Dependency Freshness</span>
                    <span className="font-bold text-blue-400">{health.metrics.dependencyFreshness.score}/100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-500" style={{ width: `${health.metrics.dependencyFreshness.score}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{health.metrics.dependencyFreshness.summary}</p>
                </div>

                {/* Code Churn Stability */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">Churn Stability</span>
                    <span className="font-bold text-purple-400">{health.metrics.codeChurnStability.score}/100</span>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full transition-all duration-500" style={{ width: `${health.metrics.codeChurnStability.score}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{health.metrics.codeChurnStability.summary}</p>
                </div>
              </div>

              {/* Actionable Recommendations */}
              <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                <div className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  Engineering Recommendations
                </div>
                <ul className="space-y-1.5">
                  {health.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
