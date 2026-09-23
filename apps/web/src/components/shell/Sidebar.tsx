import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  MessageSquare,
  Clock,
  FolderGit2,
  GitBranch,
  FolderTree,
  Network,
} from "lucide-react";
import type { FileRecord } from "@repomind/shared-types";
import { RepoFileExplorer } from "./RepoFileExplorer";

export interface ConversationItem {
  id: string;
  title: string;
  updatedAt?: string;
}

interface SidebarProps {
  width?: number;
  isResizing?: boolean;
  currentRepoName?: string;
  currentRepoBranch?: string;
  files?: FileRecord[];
  loadingFiles?: boolean;
  activeFilePath?: string | null;
  onSelectFile?: (filePath: string) => void;
  onRefreshFiles?: () => void;
  conversations?: ConversationItem[];
  activeConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onNewChat?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  width,
  isResizing = false,
  currentRepoName,
  currentRepoBranch = "main",
  files = [],
  loadingFiles = false,
  activeFilePath,
  onSelectFile,
  onRefreshFiles,
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onNewChat,
}) => {
  // Sidebar view tab: "explorer" | "threads"
  const [sidebarTab, setSidebarTab] = useState<"explorer" | "threads">("explorer");

  return (
    <aside
      style={width !== undefined ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : undefined}
      className={`${width !== undefined ? "" : "w-[260px]"} shrink-0 border-r border-white/[0.07] bg-[#090D17]/95 backdrop-blur-xl flex flex-col h-full select-none ${
        isResizing ? "transition-none" : "transition-[width] duration-150"
      }`}
    >
      {/* Current Active Repo Context Card */}
      {currentRepoName && (
        <div className="p-3 border-b border-white/[0.07] bg-white/[0.02]">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
            <span>Active Repository</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
              <FolderGit2 className="w-3.5 h-3.5" />
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-white truncate" title={currentRepoName}>
                {currentRepoName}
              </div>
              <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 truncate">
                <GitBranch className="w-2.5 h-2.5 text-slate-500" />
                {currentRepoBranch}
              </div>
            </div>
          </div>
          <Link
            to="/app/architecture"
            className="mt-2.5 w-full py-1.5 px-2 rounded-lg bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/25 text-indigo-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <Network className="w-3 h-3" />
            <span>Interactive Code Graph & Impact</span>
          </Link>
        </div>
      )}

      {/* VS Code-style Activity Selector Tab Bar */}
      <div className="p-2 border-b border-white/[0.07] bg-[#080C14]">
        <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setSidebarTab("explorer")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              sidebarTab === "explorer"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Explorer</span>
            {files.length > 0 && (
              <span className={`text-[10px] font-mono px-1 py-0.2 rounded-full ${
                sidebarTab === "explorer" ? "bg-white/20 text-white" : "bg-white/[0.06] text-slate-400"
              }`}>
                {files.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setSidebarTab("threads")}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              sidebarTab === "threads"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Threads</span>
            {conversations.length > 0 && (
              <span className={`text-[10px] font-mono px-1 py-0.2 rounded-full ${
                sidebarTab === "threads" ? "bg-white/20 text-white" : "bg-white/[0.06] text-slate-400"
              }`}>
                {conversations.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* View Content */}
      {sidebarTab === "explorer" ? (
        <div className="flex-1 overflow-hidden flex flex-col">
          <RepoFileExplorer
            files={files}
            activeFilePath={activeFilePath}
            loading={loadingFiles}
            onSelectFile={(filePath) => onSelectFile?.(filePath)}
            onRefresh={onRefreshFiles}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top action: New Query Command */}
          <div className="p-3 border-b border-white/[0.07]">
            <button
              type="button"
              onClick={onNewChat}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600/20 via-indigo-500/10 to-transparent hover:from-indigo-600/30 hover:via-indigo-500/20 border border-indigo-500/30 hover:border-indigo-500/50 text-xs font-semibold text-indigo-200 hover:text-white transition-all group shadow-sm shadow-indigo-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-400 group-hover:scale-110 motion-safe:transition-transform" />
                <span>New Query</span>
              </span>
              <kbd className="text-[10px] font-mono text-indigo-300/80 px-1.5 py-0.5 rounded-md bg-indigo-950/60 border border-indigo-500/30">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Conversation List Header */}
          <div className="px-3.5 pt-3 pb-2 flex items-center justify-between text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-slate-500" />
              <span>Recent Threads</span>
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.06]">
              {conversations.length}
            </span>
          </div>

          {/* Scrollable Conversation List */}
          <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-1 custom-scrollbar" aria-label="Conversation list">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => onSelectConversation?.(conv.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex flex-col gap-1 group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${
                    isActive
                      ? "bg-white/[0.07] text-white font-medium border border-indigo-500/40 shadow-sm shadow-indigo-500/10"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isActive ? "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" : "bg-slate-600"
                      }`}
                    />
                    <span className="truncate flex-1 font-medium" title={conv.title}>
                      {conv.title}
                    </span>
                  </div>
                  {conv.updatedAt && (
                    <span className="text-[10px] font-mono text-slate-500 pl-3.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 opacity-50" />
                      {conv.updatedAt}
                    </span>
                  )}
                </button>
              );
            })}

            {conversations.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-500 px-3">
                No past threads for this repo. Type a question below to start analyzing.
              </div>
            )}
          </nav>
        </div>
      )}
    </aside>
  );
};
