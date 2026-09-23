import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderGit2,
  GitBranch,
  Terminal,
  Activity,
  Network,
  Bug,
  GitPullRequest,
  HeartPulse,
  Plus,
  RefreshCw,
  Zap,
  Clock,
  ShieldCheck,
  Trash2,
  Hash,
} from "lucide-react";
import { useOrg } from "../../context/OrgContext";
import { useRepo } from "../../context/RepoContext";
import { WebhookModal } from "../../components/repos/WebhookModal";
import { ArchitectureModal } from "../../components/intelligence/ArchitectureModal";
import { HealthScoreModal } from "../../components/intelligence/HealthScoreModal";
import type { Repository } from "@repomind/shared-types";

export const DashboardPage: React.FC = () => {
  const { activeOrg } = useOrg();
  const {
    repositories,
    githubRepos,
    connectRepo,
    triggerReindex,
    deleteRepo,
    fetchGitHubRepos,
  } = useRepo();
  const navigate = useNavigate();

  const [showRepoModal, setShowRepoModal] = useState(false);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [connectingRepoId, setConnectingRepoId] = useState<number | null>(null);

  const [webhookRepo, setWebhookRepo] = useState<Repository | null>(null);
  const [intelModal, setIntelModal] = useState<{
    repo: Repository;
    tab: "architecture" | "bug" | "pr";
  } | null>(null);
  const [healthRepo, setHealthRepo] = useState<Repository | null>(null);

  useEffect(() => {
    fetch("/health").catch(() => {});
  }, []);

  const handleOpenConnectModal = () => {
    setShowRepoModal(true);
    fetchGitHubRepos();
  };

  const handleConnectRepo = async (githubRepoId: number) => {
    setConnectingRepoId(githubRepoId);
    try {
      const target = githubRepos.find((g) => g.id === githubRepoId);
      if (target) {
        await connectRepo({
          githubRepoId: target.id,
          name: target.name,
          fullName: target.fullName,
          defaultBranch: target.defaultBranch,
          isPrivate: target.isPrivate,
        });
      }
      setShowRepoModal(false);
    } catch (err) {
      console.error("Failed to connect repository:", err);
    } finally {
      setConnectingRepoId(null);
    }
  };

  const handleTriggerReindex = async (repoId: string) => {
    setReindexingId(repoId);
    try {
      await triggerReindex(repoId);
    } catch (err) {
      console.error("Failed to reindex repo:", err);
    } finally {
      setReindexingId(null);
    }
  };

  const handleDeleteRepo = async (repoId: string) => {
    if (window.confirm("Are you sure you want to disconnect this repository? All vector indices will be deleted.")) {
      await deleteRepo(repoId);
    }
  };

  // Aggregated Stats
  const totalRepos = repositories.length;
  const readyRepos = repositories.filter((r) => r.indexStatus === "indexed").length;
  const indexingRepos = repositories.filter((r) => r.indexStatus === "indexing").length;

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Banner / Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Command Center</span>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {activeOrg?.name || "Personal"}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time repository index states, AST chunk boundaries, and AI engineering intelligence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenConnectModal}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold flex items-center gap-2 transition shadow-lg shadow-indigo-500/25 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Repository</span>
          </button>

          <button
            onClick={() => navigate("/app/workspace")}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Open Workspace</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Connected Repos</span>
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{totalRepos}</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
            <span>{readyRepos} Indexed &bull; {indexingRepos} Syncing</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>AST Semantic Chunks</span>
            <Hash className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">43+</div>
          <div className="text-[11px] text-cyan-300 flex items-center gap-1 font-mono">
            <span>Tree-sitter Language Grammars</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Retrieval Latency</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">&lt; 25ms</div>
          <div className="text-[11px] text-amber-300 flex items-center gap-1 font-mono">
            <span>RRF (Dense + BM25)</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Citation Grounding</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">100%</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
            <span>Zero Hallucination Fencing</span>
          </div>
        </div>
      </div>

      {/* Connected Repositories Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-indigo-400" />
            <span>Active Repositories</span>
          </h2>
          <span className="text-xs text-slate-400 font-mono">
            {repositories.length} repository registered
          </span>
        </div>

        {repositories.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.01] text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No connected repositories yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Connect your GitHub repository to index AST chunks, build architecture graphs, and unlock grounded AI chat.
              </p>
            </div>
            <button
              onClick={handleOpenConnectModal}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-500/25 cursor-pointer"
            >
              Connect First Repository
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] hover:border-indigo-500/30 transition flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">{repo.name}</h3>
                      <p className="text-xs font-mono text-slate-400">{repo.fullName}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold border ${
                        repo.indexStatus === "indexed"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : repo.indexStatus === "indexing"
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/20 animate-pulse"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {repo.indexStatus === "indexed"
                        ? "Indexed & Ready"
                        : repo.indexStatus === "indexing"
                        ? "Indexing..."
                        : repo.indexStatus}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 font-mono pt-1">
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{repo.branch}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{new Date(repo.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Repository Quick Action Bar */}
                <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/app/repositories/${repo.id}`)}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Open in Workspace</span>
                    </button>

                    <button
                      onClick={() => handleTriggerReindex(repo.id)}
                      disabled={reindexingId === repo.id}
                      className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] text-xs transition cursor-pointer"
                      title="Trigger Differential Reindex"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${reindexingId === repo.id ? "animate-spin text-indigo-400" : ""}`} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIntelModal({ repo, tab: "architecture" })}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.04] transition"
                      title="Architecture Graph"
                    >
                      <Network className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setHealthRepo(repo)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/[0.04] transition"
                      title="Health Score"
                    >
                      <HeartPulse className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setWebhookRepo(repo)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/[0.04] transition"
                      title="Webhook Integration"
                    >
                      <Activity className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRepo(repo.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/[0.04] transition"
                      title="Disconnect Repo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Engineering Intelligence Suite Cards */}
      <div className="space-y-4 pt-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Core Engineering Intelligence Suite</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div
            onClick={() => {
              if (repositories[0]) setIntelModal({ repo: repositories[0], tab: "architecture" });
            }}
            className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/30 transition cursor-pointer space-y-3"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Network className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Architecture & Dependency Graph</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trace cross-file import hierarchies, detect circular dependency cycles, and inspect subsystem clustering.
            </p>
          </div>

          <div
            onClick={() => {
              if (repositories[0]) setIntelModal({ repo: repositories[0], tab: "bug" });
            }}
            className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/30 transition cursor-pointer space-y-3"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bug className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Cross-File Bug Investigator</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trace stack traces and exceptions across function callers to pinpoint culprits with verified git diff fixes.
            </p>
          </div>

          <div
            onClick={() => {
              if (repositories[0]) setIntelModal({ repo: repositories[0], tab: "pr" });
            }}
            className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/30 transition cursor-pointer space-y-3"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <GitPullRequest className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Automated PR Advisory</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Context-aware diff analysis evaluating breaking contract changes, architectural side effects, and risk scores.
            </p>
          </div>
        </div>
      </div>

      {/* Connect Repository Modal */}
      {showRepoModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1322] border border-white/[0.08] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Connect GitHub Repository</h3>
              </div>
              <button
                onClick={() => setShowRepoModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2">
              {githubRepos.map((ghRepo) => (
                <div
                  key={ghRepo.id}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{ghRepo.fullName}</div>
                    <div className="text-[11px] text-slate-400 font-mono">{ghRepo.defaultBranch}</div>
                  </div>
                  <button
                    onClick={() => handleConnectRepo(ghRepo.id)}
                    disabled={connectingRepoId === ghRepo.id}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    {connectingRepoId === ghRepo.id ? "Connecting..." : "Connect"}
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowRepoModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intelligence Modals */}
      {intelModal && (
        <ArchitectureModal
          repo={intelModal.repo}
          isOpen={!!intelModal}
          initialTab={intelModal.tab}
          onClose={() => setIntelModal(null)}
        />
      )}

      {healthRepo && (
        <HealthScoreModal
          repo={healthRepo}
          onClose={() => setHealthRepo(null)}
        />
      )}

      {webhookRepo && (
        <WebhookModal
          repo={webhookRepo}
          isOpen={!!webhookRepo}
          onClose={() => setWebhookRepo(null)}
        />
      )}
    </div>
  );
};
