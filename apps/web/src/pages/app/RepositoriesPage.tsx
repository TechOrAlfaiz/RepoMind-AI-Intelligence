import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderGit2,
  GitBranch,
  Plus,
  RefreshCw,
  Trash2,
  Terminal,
} from "lucide-react";
import { useRepo } from "../../context/RepoContext";

export const RepositoriesPage: React.FC = () => {
  const {
    repositories,
    githubRepos,
    connectRepo,
    triggerReindex,
    deleteRepo,
    fetchGitHubRepos,
  } = useRepo();
  const navigate = useNavigate();

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);

  const handleOpenConnect = () => {
    setShowConnectModal(true);
    fetchGitHubRepos();
  };

  const handleConnect = async (id: number) => {
    setConnectingId(id);
    try {
      const target = githubRepos.find((g) => g.id === id);
      if (target) {
        await connectRepo({
          githubRepoId: target.id,
          name: target.name,
          fullName: target.fullName,
          defaultBranch: target.defaultBranch,
          isPrivate: target.isPrivate,
        });
      }
      setShowConnectModal(false);
    } finally {
      setConnectingId(null);
    }
  };

  const handleReindex = async (id: string) => {
    setReindexingId(id);
    try {
      await triggerReindex(id);
    } finally {
      setReindexingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to disconnect this repository?")) {
      await deleteRepo(id);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Connected Repositories
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your synchronized GitHub repositories, inspect AST indexing status, and trigger differential re-indexing.
          </p>
        </div>

        <button
          onClick={handleOpenConnect}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-500/25 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Connect Repository</span>
        </button>
      </div>

      {/* Repositories Table / Grid */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.01] overflow-hidden">
        <div className="p-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between text-xs font-mono text-slate-400">
          <span>{repositories.length} Repositories Registered</span>
          <span>Automatic Webhook Sync Enabled</span>
        </div>

        {repositories.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FolderGit2 className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400">No repositories connected yet.</p>
            <button
              onClick={handleOpenConnect}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
            >
              Connect First Repo
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white tracking-tight">{repo.name}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        repo.indexStatus === "indexed"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : repo.indexStatus === "indexing"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/20 animate-pulse"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {repo.indexStatus}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                    <span>{repo.fullName}</span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3 text-indigo-400" />
                      {repo.branch}
                    </span>
                    <span>&bull;</span>
                    <span>Last sync: {new Date(repo.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate(`/app/repositories/${repo.id}`)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Open Workspace</span>
                  </button>
                  <button
                    onClick={() => handleReindex(repo.id)}
                    disabled={reindexingId === repo.id}
                    className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] text-xs transition cursor-pointer"
                    title="Trigger Reindex"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${reindexingId === repo.id ? "animate-spin text-indigo-400" : ""}`} />
                  </button>
                  <button
                    onClick={() => handleDelete(repo.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/[0.04] transition"
                    title="Disconnect Repo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1322] border border-white/[0.08] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <h3 className="text-base font-bold text-white">Connect GitHub Repository</h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {githubRepos.map((gh) => (
                <div
                  key={gh.id}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{gh.fullName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{gh.defaultBranch}</div>
                  </div>
                  <button
                    onClick={() => handleConnect(gh.id)}
                    disabled={connectingId === gh.id}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {connectingId === gh.id ? "Connecting..." : "Connect"}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
