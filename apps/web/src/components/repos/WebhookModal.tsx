import { useState } from "react";
import { useIngestionProgress } from "../../hooks/useIngestionProgress";
import type { Repository } from "@repomind/shared-types";

interface WebhookModalProps {
  repo: Repository;
  isOpen: boolean;
  onClose: () => void;
}

export function WebhookModal({ repo, isOpen, onClose }: WebhookModalProps) {
  const [simulating, setSimulating] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);
  const [addedFile, setAddedFile] = useState("src/components/FeatureFlag.tsx");
  const [modifiedFile, setModifiedFile] = useState("src/server.ts");
  const [removedFile, setRemovedFile] = useState("src/legacy/oldUtil.ts");

  const { progress, isConnected, history } = useIngestionProgress({
    repositoryId: repo.id,
  });

  if (!isOpen) return null;

  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${baseOrigin}/api/webhooks/github?repoId=${encodeURIComponent(repo.id)}`;
  const secretKey = "repomind-webhook-secret-default";

  const handleSimulatePush = async () => {
    setSimulating(true);
    setTestResult(null);

    const randomSha = Array.from({ length: 40 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("");
    const beforeSha = repo.currentCommitSha || "0000000000000000000000000000000000000000";

    const payload = {
      ref: `refs/heads/${repo.defaultBranch || "main"}`,
      before: beforeSha,
      after: randomSha,
      repository: {
        id: 12345678,
        name: repo.name,
        full_name: repo.fullName,
        default_branch: repo.defaultBranch || "main",
      },
      head_commit: {
        id: randomSha,
        message: "feat: add feature flag & update server config [simulated push]",
        timestamp: new Date().toISOString(),
        author: {
          name: "RepoMind Bot",
          email: "bot@repomind.ai",
        },
        added: addedFile ? [addedFile] : [],
        modified: modifiedFile ? [modifiedFile] : [],
        removed: removedFile ? [removedFile] : [],
      },
      commits: [
        {
          id: randomSha,
          message: "feat: add feature flag & update server config [simulated push]",
          timestamp: new Date().toISOString(),
          author: {
            name: "RepoMind Bot",
            email: "bot@repomind.ai",
          },
          added: addedFile ? [addedFile] : [],
          modified: modifiedFile ? [modifiedFile] : [],
          removed: removedFile ? [removedFile] : [],
        },
      ],
    };

    try {
      const res = await fetch(`/api/webhooks/github?repoId=${encodeURIComponent(repo.id)}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "push",
          "X-Repomind-Repo-Id": repo.id,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      setTestResult({ ok: res.ok, status: res.status, data });
    } catch (err: any) {
      setTestResult({ ok: false, status: 500, error: err.message });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white text-lg font-bold shadow-md">
              ⚡
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                GitHub Webhook & Realtime Streaming
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  isConnected ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}>
                  {isConnected ? "● WS Connected" : "○ WS Disconnected"}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Incremental AST diffing & live ingestion progress for <span className="text-indigo-400 font-mono">{repo.fullName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Webhook Configuration Details */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GitHub Settings Configuration</div>
            <div>
              <label className="text-xs text-slate-400">Payload URL</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="w-full text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 selection:bg-indigo-500"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(webhookUrl)}
                  className="px-3 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs text-slate-400">Content Type</label>
                <div className="text-xs font-mono text-indigo-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg mt-1">
                  application/json
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Secret (HMAC SHA-256)</label>
                <div className="text-xs font-mono text-emerald-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg mt-1">
                  {secretKey}
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              Trigger events on: <span className="text-slate-300 font-medium">Just the push event</span>. Only modified, added, and deleted files will be re-processed (Zero full-repo reindexing).
            </div>
          </div>

          {/* Realtime Ingestion Progress Banner */}
          {progress && (
            <div className="bg-gradient-to-r from-slate-950 to-indigo-950/40 border border-indigo-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                  </span>
                  <span className="text-xs font-bold uppercase text-indigo-300 tracking-wider">
                    Live Progress: {progress.stage}
                  </span>
                </div>
                <span className="text-sm font-bold text-indigo-400 font-mono">
                  {progress.percent}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="truncate max-w-md">
                  {progress.currentFile ? `Processing: ${progress.currentFile}` : progress.message || "Streaming updates..."}
                </span>
                {progress.totalFiles !== undefined && (
                  <span className="font-mono text-slate-500">
                    {progress.processedFiles || 0} / {progress.totalFiles} files
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Simulated Push Diff Generator */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Simulate GitHub Push Diff</h3>
                <p className="text-xs text-slate-400">Trigger incremental AST update without needing a live public webhook tunnel</p>
              </div>
              <button
                disabled={simulating}
                onClick={handleSimulatePush}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-500/20 transition disabled:opacity-50 flex items-center gap-2"
              >
                {simulating ? "Processing Push..." : "🚀 Send Incremental Push"}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-emerald-400 font-medium">+ Added File</label>
                <input
                  type="text"
                  value={addedFile}
                  onChange={(e) => setAddedFile(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] text-amber-400 font-medium">~ Modified File</label>
                <input
                  type="text"
                  value={modifiedFile}
                  onChange={(e) => setModifiedFile(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 mt-1"
                />
              </div>
              <div>
                <label className="text-[11px] text-rose-400 font-medium">- Removed File</label>
                <input
                  type="text"
                  value={removedFile}
                  onChange={(e) => setRemovedFile(e.target.value)}
                  className="w-full text-xs font-mono bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 mt-1"
                />
              </div>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg border text-xs font-mono ${
                testResult.ok ? "bg-emerald-950/20 border-emerald-800/40 text-emerald-300" : "bg-rose-950/20 border-rose-800/40 text-rose-300"
              }`}>
                <div className="font-bold mb-1">
                  HTTP {testResult.status} {testResult.ok ? "SUCCESS — Diff Processed" : "FAILED"}
                </div>
                {testResult.data?.result && (
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>Added: {testResult.data.result.addedIndexed} files (new AST chunks & vectors)</div>
                    <div>Modified: {testResult.data.result.modifiedReindexed} files reindexed (skipped unchanged: {testResult.data.result.modifiedSkipped})</div>
                    <div>Removed: {testResult.data.result.removedPurged} files & associated vectors purged</div>
                    <div className="text-indigo-400 pt-1">Commit SHA: {testResult.data.result.commitSha?.slice(0, 7)}</div>
                  </div>
                )}
                {testResult.error && <div>Error: {testResult.error}</div>}
              </div>
            )}
          </div>

          {/* Event Stream Log */}
          {history.length > 0 && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
              <div className="text-[11px] font-mono text-slate-400 uppercase mb-2 flex items-center justify-between">
                <span>WebSocket Live Events Log ({history.length})</span>
                <span className="text-[10px] text-slate-500">Auto-streaming</span>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto text-[11px] font-mono pr-1">
                {history.slice().reverse().map((ev, i) => (
                  <div key={i} className="flex items-start gap-2 text-slate-400">
                    <span className="text-slate-600 shrink-0">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                    </span>
                    <span className="text-indigo-400 font-semibold shrink-0">[{ev.stage}]</span>
                    <span className="text-slate-300 truncate">{ev.message || ev.currentFile}</span>
                    <span className="text-slate-500 shrink-0 ml-auto">{ev.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Invariant: Only modified, added, and deleted files will trigger vector upserts / chunk deletions.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
