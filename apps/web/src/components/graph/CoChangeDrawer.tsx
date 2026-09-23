import React, { useState, useEffect } from "react";
import {
  X,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

interface CoChangeItem {
  primaryFile: string;
  coChangedFiles: string[];
  frequencyScore: number;
  rationale: string;
}

interface CoChangeDrawerProps {
  repoId: string;
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (filePath: string) => void;
}

export const CoChangeDrawer: React.FC<CoChangeDrawerProps> = ({
  repoId,
  isOpen,
  onClose,
  onSelectFile,
}) => {
  const [coChanges, setCoChanges] = useState<CoChangeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !repoId) return;
    setLoading(true);
    fetch(`http://localhost:4000/api/repos/${repoId}/co-changes`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.coChanges)) {
          setCoChanges(data.coChanges);
        }
      })
      .catch((err) => console.warn("Failed to fetch co-changes:", err))
      .finally(() => setLoading(false));
  }, [isOpen, repoId]);

  if (!isOpen) return null;

  return (
    <div className="w-80 sm:w-96 h-full bg-slate-900/95 border-l border-white/[0.08] backdrop-blur-xl flex flex-col z-30 shadow-2xl animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Historical Co-Change</h2>
            <p className="text-[10px] text-slate-400">Git commit co-evolution patterns</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Disclaimers: Distinct from Deterministic Dependency */}
      <div className="p-3 bg-cyan-950/20 border-b border-cyan-500/20 text-[11px] text-cyan-200 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <span>
          <strong>Statistical Co-Change:</strong> Files frequently modified together across historical Git commits. Distinct from deterministic code import dependencies.
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-7 h-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400 font-mono">Analyzing commit co-occurrence...</p>
          </div>
        ) : coChanges.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No recurring co-change patterns detected in current commit history.
          </div>
        ) : (
          coChanges.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-950 border border-white/[0.06] space-y-2 hover:border-cyan-500/30 transition"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-white truncate max-w-[200px]" title={item.primaryFile}>
                  {item.primaryFile.split("/").pop()}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  {Math.round(item.frequencyScore * 100)}% Co-Change
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Frequently Changes With:
                </span>
                <div className="flex flex-wrap gap-1">
                  {item.coChangedFiles.map((cf, i) => (
                    <button
                      key={i}
                      onClick={() => onSelectFile(cf)}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-white/[0.06] transition"
                    >
                      {cf.split("/").pop()}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic pt-1 border-t border-white/[0.04]">
                {item.rationale}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
