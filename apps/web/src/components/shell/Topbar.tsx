import React, { useState, useRef, useEffect } from "react";
import {
  Sun,
  Moon,
  Menu,
  GitBranch,
  LayoutDashboard,
  Sparkles,
  Terminal,
  ChevronDown,
  Check,
  Plus,
  FolderGit2,
  Search,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export interface RepoChipProps {
  id?: string;
  name: string;
  fullName?: string;
  branch: string;
  indexStatus: "ready" | "indexing" | "pending" | "error";
}

interface TopbarProps {
  repo?: RepoChipProps;
  repositories?: RepoChipProps[];
  onSelectRepo?: (repoId: string) => void;
  onConnectNewRepo?: () => void;
  onToggleMobileMenu?: () => void;
  onExitShell?: () => void;
  onOpenShowcase?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  repo = { name: "repomind-core", branch: "main", indexStatus: "ready" },
  repositories = [],
  onSelectRepo,
  onConnectNewRepo,
  onToggleMobileMenu,
  onExitShell,
  onOpenShowcase,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [repoSearchQuery, setRepoSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsRepoDropdownOpen(false);
      }
    };
    if (isRepoDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isRepoDropdownOpen]);

  const getStatusDot = (status: RepoChipProps["indexStatus"]) => {
    switch (status) {
      case "ready":
        return "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]";
      case "indexing":
        return "bg-indigo-400 motion-safe:animate-pulse shadow-[0_0_10px_rgba(129,140,248,0.7)]";
      case "error":
        return "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.7)]";
      default:
        return "bg-slate-500";
    }
  };

  const getStatusText = (status: RepoChipProps["indexStatus"]) => {
    switch (status) {
      case "ready":
        return "Indexed & Ready";
      case "indexing":
        return "Indexing AST...";
      case "error":
        return "Index Error";
      default:
        return "Pending Sync";
    }
  };

  const filteredRepos = repositories.filter((r) =>
    r.name.toLowerCase().includes(repoSearchQuery.toLowerCase()) ||
    (r.fullName && r.fullName.toLowerCase().includes(repoSearchQuery.toLowerCase()))
  );

  return (
    <header className="h-14 w-full bg-[#0B101B]/80 backdrop-blur-xl border-b border-white/[0.07] flex items-center justify-between px-3 md:px-5 shrink-0 select-none z-30 transition-all relative">
      {/* Left: Mobile menu toggle + Brand Mark + Interactive Repo Switcher */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation drawer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] transition-colors shell-desktop:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Brand Mark with Gradient Icon */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 shrink-0">
            <div className="w-full h-full bg-[#080C14] rounded-[11px] flex items-center justify-center">
              <Terminal className="w-4 h-4 text-indigo-400" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-white">
              RepoMind
            </span>
            <span className="text-[10px] font-semibold font-mono px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              AI
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="h-4 w-[1px] bg-white/[0.1] mx-1 hidden sm:block" />

        {/* Interactive Active Repository Pill & Dropdown Switcher */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsRepoDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-indigo-500/40 text-xs transition-all shadow-inner group cursor-pointer"
            title="Click to switch or select repository"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-semibold text-slate-200 group-hover:text-white max-w-[140px] sm:max-w-[200px] truncate">
              {repo.name}
            </span>
            <span className="text-slate-600">/</span>
            <span className="font-mono text-slate-400 hidden sm:flex items-center gap-1 text-[11px]">
              <GitBranch className="w-3 h-3 text-slate-500" />
              {repo.branch}
            </span>
            <span className="h-3 w-[1px] bg-white/[0.1] mx-0.5 hidden sm:block" />
            <span className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-300 font-mono">
              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(repo.indexStatus)}`} />
              {getStatusText(repo.indexStatus)}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform ${
                isRepoDropdownOpen ? "rotate-180 text-indigo-400" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isRepoDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#0D1424] border border-white/[0.1] shadow-2xl shadow-black/80 backdrop-blur-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="px-2.5 py-1.5 border-b border-white/[0.06] flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Switch Active Repository
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] text-indigo-300 border border-white/[0.08]">
                  {repositories.length} Connected
                </span>
              </div>

              {/* Search input if multiple repos exist */}
              {repositories.length > 3 && (
                <div className="px-2 py-1 mb-1.5">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#080C14] border border-white/[0.08] text-xs">
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search repositories..."
                      value={repoSearchQuery}
                      onChange={(e) => setRepoSearchQuery(e.target.value)}
                      className="bg-transparent text-white outline-none w-full placeholder:text-slate-600 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Repository List */}
              <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                {filteredRepos.length > 0 ? (
                  filteredRepos.map((r) => {
                    const isActive = r.id === repo.id || r.name === repo.name;
                    return (
                      <button
                        key={r.id || r.name}
                        type="button"
                        onClick={() => {
                          if (r.id && onSelectRepo) {
                            onSelectRepo(r.id);
                          }
                          setIsRepoDropdownOpen(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between group ${
                          isActive
                            ? "bg-indigo-600/20 text-white font-medium border border-indigo-500/40"
                            : "text-slate-300 hover:text-white hover:bg-white/[0.05] border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <FolderGit2
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-indigo-300"
                            }`}
                          />
                          <div className="truncate">
                            <div className="font-semibold text-white truncate flex items-center gap-1.5">
                              <span>{r.name}</span>
                              <span className="text-[10px] font-mono text-slate-500">({r.branch})</span>
                            </div>
                            {r.fullName && (
                              <div className="text-[10px] font-mono text-slate-500 truncate">
                                {r.fullName}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(r.indexStatus)}`} />
                          {isActive && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No repositories match &ldquo;{repoSearchQuery}&rdquo;
                  </div>
                )}
              </div>

              {/* Action: Connect New Repository */}
              {onConnectNewRepo && (
                <div className="pt-2 mt-2 border-t border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => {
                      setIsRepoDropdownOpen(false);
                      onConnectNewRepo();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-indigo-600/20 text-indigo-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 border border-white/[0.08] hover:border-indigo-500/30 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect New Repository</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions, Dashboard switcher & Theme Toggle */}
      <div className="flex items-center gap-2">
        {onOpenShowcase && (
          <button
            type="button"
            onClick={onOpenShowcase}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Showcase</span>
          </button>
        )}

        {onExitShell && (
          <button
            type="button"
            onClick={onExitShell}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-indigo-400" />
            <span>Dashboard</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
          title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.05] border border-white/[0.08] transition-all"
        >
          {resolvedTheme === "dark" ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-400" />
          )}
        </button>
      </div>
    </header>
  );
};
