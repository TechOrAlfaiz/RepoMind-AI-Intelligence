import React, { useState, useEffect } from "react";
import {
  Clock,
  GitCommit,
} from "lucide-react";

export interface TimelineSnapshot {
  id: string;
  label: string;
  date: string;
  sha: string;
  message: string;
  activeNodesCount: number;
  activeEdgesCount: number;
  addedFiles: string[];
}

interface ArchitectureTimelineBarProps {
  repoId: string;
  activeSnapshotId: string;
  onSelectSnapshot: (snapshot: TimelineSnapshot) => void;
}

export const ArchitectureTimelineBar: React.FC<ArchitectureTimelineBarProps> = ({
  repoId,
  activeSnapshotId,
  onSelectSnapshot,
}) => {
  const [snapshots, setSnapshots] = useState<TimelineSnapshot[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repoId) return;
    setLoading(true);
    fetch(`/api/repos/${repoId}/timeline`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.snapshots)) {
          setSnapshots(data.snapshots);
        }
      })
      .catch((err) => console.warn("Failed to fetch architecture timeline:", err))
      .finally(() => setLoading(false));
  }, [repoId]);

  if (snapshots.length === 0 && !loading) return null;

  return (
    <div className="px-4 py-2.5 bg-[#090D17] border-t border-white/[0.08] flex items-center justify-between gap-4 text-xs select-none">
      <div className="flex items-center gap-2 flex-shrink-0">
        <Clock className="w-3.5 h-3.5 text-indigo-400" />
        <span className="font-semibold text-slate-300 hidden sm:inline">Architecture Timeline:</span>
      </div>

      {/* Snapshot Stepper */}
      <div className="flex items-center gap-2 overflow-x-auto flex-1 py-1">
        {snapshots.map((snap, idx) => {
          const isActive = snap.id === activeSnapshotId;
          return (
            <React.Fragment key={snap.id}>
              <button
                onClick={() => onSelectSnapshot(snap)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition cursor-pointer flex-shrink-0 ${
                  isActive
                    ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30"
                    : "bg-slate-900 text-slate-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.05]"
                }`}
              >
                <GitCommit className="w-3 h-3 text-indigo-400" />
                <span>{snap.label}</span>
                <span className="text-[10px] opacity-75 font-mono">({snap.activeNodesCount} nodes)</span>
              </button>
              {idx < snapshots.length - 1 && (
                <div className="w-4 h-[1px] bg-white/[0.1] flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="text-[10px] text-slate-500 font-mono hidden md:inline flex-shrink-0">
        Time Machine Scrubber
      </div>
    </div>
  );
};
