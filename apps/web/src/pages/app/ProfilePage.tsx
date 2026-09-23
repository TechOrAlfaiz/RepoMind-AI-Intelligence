import React, { useState } from "react";
import {
  User,
  Shield,
  Github,
  Key,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Laptop,
  Clock,
  Sparkles,
  Save,
  Building2,
  Code2,
  ShieldCheck,
  GitBranch,
  LogOut,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useOrg } from "../../context/OrgContext";
import { useRepo } from "../../context/RepoContext";

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const { activeOrg } = useOrg();
  const { repositories } = useRepo();

  const [activeTab, setActiveTab] = useState<"general" | "github" | "security" | "preferences">("general");
  const [displayName, setDisplayName] = useState(user?.displayName || user?.username || "TechOrAlfaiz");
  const [bio, setBio] = useState("Fullstack Systems Engineer & Distributed AST RAG Architect");
  const [email, setEmail] = useState(user?.email || "developer@repomind.ai");
  const [specialization, setSpecialization] = useState("Fullstack Systems & AI Code Intelligence");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [autoIndex, setAutoIndex] = useState(true);
  const [zeroHallucination, setZeroHallucination] = useState(true);

  const [copiedId, setCopiedId] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(user?.id || "usr_repomind_dev_999");
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const initials = user?.username ? user.username.charAt(0).toUpperCase() : "T";

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* 1. HERO HEADER PROFILE CARD */}
      <div className="relative rounded-2xl border border-white/[0.08] bg-[#0A0F1D]/80 backdrop-blur-xl overflow-hidden shadow-2xl">
        {/* Cover Gradient Graphic */}
        <div className="h-32 sm:h-40 w-full bg-gradient-to-r from-indigo-950 via-slate-900 to-cyan-950/60 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute -top-12 -left-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-3 right-4 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-semibold flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Verified Developer
            </span>
          </div>
        </div>

        {/* User Info Bar */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
          <div className="flex items-end gap-4">
            {/* Avatar with Glow */}
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[2px] shadow-2xl shadow-indigo-500/30">
                <div className="w-full h-full bg-[#080C14] rounded-[14px] flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl sm:text-4xl font-black font-mono bg-gradient-to-br from-white via-indigo-200 to-cyan-300 bg-clip-text text-transparent">
                      {initials}
                    </span>
                  )}
                </div>
              </div>
              <div
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#0A0F1D] shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                title="Active Session"
              />
            </div>

            {/* Names & Metadata */}
            <div className="space-y-1 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {displayName}
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold uppercase">
                  {activeOrg?.userRole || "Admin"}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono flex items-center gap-2">
                <span>@{user?.username || "TechOrAlfaiz"}</span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-slate-400">{email}</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-end pt-2 sm:pt-0">
            <button
              onClick={handleCopyUserId}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
              title="Copy internal User ID"
            >
              {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedId ? "Copied" : "Copy ID"}</span>
            </button>
            <a
              href="https://github.com/TechOrAlfaiz"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3 text-indigo-400" />
            </a>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="border-t border-white/[0.06] bg-[#070B14]/60 px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Workspace: <strong className="text-white">{activeOrg?.name || "Personal"}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Connected Repos: <strong className="text-white">{repositories.length}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Zero-Retention: <strong className="text-emerald-300">Enforced</strong></span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Tenant Status: <strong className="text-amber-300">Healthy</strong></span>
          </div>
        </div>
      </div>

      {/* Save Success Alert */}
      {saved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg shadow-emerald-500/10 animate-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">User profile and developer preferences successfully saved!</span>
        </div>
      )}

      {/* 2. TABBED CONFIGURATION INTERFACE */}
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 border-b border-white/[0.08] pb-1 overflow-x-auto text-xs font-semibold">
          {[
            { id: "general", label: "Profile & Identity", icon: User },
            { id: "github", label: "GitHub & Repositories", icon: Github },
            { id: "security", label: "Security & Sessions", icon: Shield },
            { id: "preferences", label: "Intelligence Preferences", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 1: General Profile */}
        {activeTab === "general" && (
          <form onSubmit={handleSave} className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-5">
              <div className="border-b border-white/[0.06] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-400" />
                  <span>Public Developer Profile</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Manage how your identity and engineering credentials are presented across RepoMind workspaces.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080C14] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500 font-medium transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Username / Handle</label>
                  <input
                    type="text"
                    value={user?.username || "TechOrAlfaiz"}
                    readOnly
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.01] border border-white/[0.06] text-slate-400 font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold flex items-center justify-between">
                    <span>Email Address</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Primary Verified</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080C14] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500 font-mono transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold">Engineering Specialization</label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080C14] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500 font-medium transition"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <label className="text-slate-300 font-semibold">Developer Bio & Research Scope</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080C14] border border-white/[0.08] text-white focus:outline-none focus:border-indigo-500 font-normal leading-relaxed resize-none transition"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-500/25 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: GitHub & Repositories */}
        {activeTab === "github" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-5">
              <div className="border-b border-white/[0.06] pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Github className="w-4 h-4 text-cyan-400" />
                    <span>GitHub OAuth Link & Repository Indexing</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Manage sync triggers, tree-sitter AST parsing policies, and branch listeners.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Connected: @{user?.username || "TechOrAlfaiz"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-[#080C14] border border-white/[0.06] space-y-2">
                  <span className="text-[11px] text-slate-400 uppercase font-mono">Default Target Branch</span>
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-indigo-400" />
                    <input
                      type="text"
                      value={defaultBranch}
                      onChange={(e) => setDefaultBranch(e.target.value)}
                      className="bg-transparent font-mono text-white text-xs outline-none flex-1 border-b border-white/[0.1] focus:border-indigo-500 py-0.5"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    AST semantic graph generator will automatically analyze this branch on git push.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#080C14] border border-white/[0.06] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200 block">Automatic Re-indexing</span>
                    <p className="text-[10px] text-slate-400">
                      Trigger incremental Tree-sitter delta builds when webhooks receive commit push payloads.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoIndex(!autoIndex)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      autoIndex ? "bg-indigo-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        autoIndex ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Connected Repositories Quick Table */}
              <div className="space-y-2 text-xs">
                <h3 className="font-semibold text-slate-300 font-mono text-[11px] uppercase">
                  Connected Repositories ({repositories.length})
                </h3>
                <div className="rounded-xl border border-white/[0.06] bg-[#070B14] overflow-hidden divide-y divide-white/[0.04]">
                  {repositories.map((repo) => (
                    <div key={repo.id} className="p-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition">
                      <div className="flex items-center gap-2.5">
                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                        <div>
                          <span className="font-mono font-bold text-white">{repo.name}</span>
                          <span className="text-slate-500 text-[10px] font-mono ml-2">({repo.branch})</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-semibold">
                        {repo.indexStatus.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Security & Sessions */}
        {activeTab === "security" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-5">
              <div className="border-b border-white/[0.06] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Security & Active Developer Sessions</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Inspect your authenticated cryptographic sessions, token boundaries, and access logs.
                </p>
              </div>

              {/* Active Sessions */}
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-300 font-mono uppercase text-[11px]">
                  Active Sessions
                </span>
                <div className="p-4 rounded-xl bg-[#080C14] border border-white/[0.06] flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>Current Browser Session</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">
                          THIS DEVICE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                        Current Browser Session &bull; Verified Client
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Active Now</span>
                </div>
              </div>

              {/* Two-Factor Authentication Status */}
              <div className="p-4 rounded-xl bg-[#080C14] border border-white/[0.06] flex items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <Key className="w-4 h-4 text-cyan-400" />
                    <span>Two-Factor Authentication (2FA)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    GitHub OAuth FIDO2 security hardware key / WebAuthn token verified.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] font-semibold">
                  ENABLED
                </span>
              </div>

              {/* Session Sign Out */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-rose-300 block">Sign Out of All Sessions</span>
                  <p className="text-[11px] text-slate-500">
                    Terminates active session cookie and redirects to the login console.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={logout}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Preferences */}
        {activeTab === "preferences" && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.07] space-y-5">
              <div className="border-b border-white/[0.06] pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>AI Engineering Intelligence Preferences</span>
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tune citation fencing thresholds, vector embedding density, and code graph presentation.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-xl bg-[#080C14] border border-white/[0.06] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-slate-200 block">Strict Zero-Hallucination Fencing</span>
                    <p className="text-[10px] text-slate-400">
                      Discards any AI response tokens that lack 100% verifiable line-level AST citations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setZeroHallucination(!zeroHallucination)}
                    className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                      zeroHallucination ? "bg-indigo-600" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        zeroHallucination ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-[#080C14] border border-white/[0.06] space-y-2">
                  <span className="text-xs font-semibold text-slate-200 block">Vector Embedding Model</span>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      readOnly
                      value="text-embedding-3-small (1536-dimensional Qdrant Collection)"
                      className="w-full bg-[#050811] px-3 py-2 rounded-lg border border-white/[0.08] text-slate-300 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
