import React, { useState, useEffect, useCallback } from "react";
import { MessageSquare, FileCode } from "lucide-react";
import type { FileRecord } from "@repomind/shared-types";
import { Topbar, type RepoChipProps } from "./Topbar";
import { Sidebar, type ConversationItem } from "./Sidebar";
import { ChatPane, type Citation } from "../chat/ChatPane";
import { CodeViewer } from "../viewer/CodeViewer";

export interface AppShellRepo extends RepoChipProps {
  id?: string;
  fullName?: string;
}

interface AppShellProps {
  repo?: AppShellRepo;
  repositories?: AppShellRepo[];
  onSelectRepo?: (repoId: string) => void;
  onConnectNewRepo?: () => void;
  organizationId?: string;
  conversations?: ConversationItem[];
  children?: React.ReactNode;
  onExitShell?: () => void;
  onOpenShowcase?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  repo = { name: "repomind-core", branch: "main", indexStatus: "ready" },
  repositories = [],
  onSelectRepo,
  onConnectNewRepo,
  organizationId,
  conversations,
  children,
  onExitShell,
  onOpenShowcase,
}) => {
  const [activeConversationId, setActiveConversationId] = useState<string>("conv-1");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeSource, setActiveSource] = useState<Citation | null>(null);
  const [activeTab, setActiveTab] = useState<"chat" | "code">("chat");
  // Local mutable copy of conversations
  const [localConversations, setLocalConversations] = useState<ConversationItem[]>(
    conversations ?? []
  );
  // Real repository files list for Explorer
  const [repoFiles, setRepoFiles] = useState<FileRecord[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Window Resizing State & Refs
  const [explorerWidth, setExplorerWidth] = useState<number>(() => {
    const saved = localStorage.getItem("repomind_explorer_width");
    if (!saved) return 260;
    const parsed = parseInt(saved, 10);
    return isNaN(parsed) || parsed < 240 ? 260 : Math.min(520, parsed);
  });
  const [isResizingExplorer, setIsResizingExplorer] = useState(false);

  const [chatSplitRatio, setChatSplitRatio] = useState<number>(() => {
    const saved = localStorage.getItem("repomind_chat_code_split");
    return saved ? Math.max(0.2, Math.min(0.8, parseFloat(saved))) : 0.5;
  });
  const [isResizingSplit, setIsResizingSplit] = useState(false);

  const sidebarContainerRef = React.useRef<HTMLDivElement>(null);
  const splitContainerRef = React.useRef<HTMLDivElement>(null);

  // Enforce valid explorer width on mount/change
  React.useEffect(() => {
    if (!explorerWidth || explorerWidth < 240 || isNaN(explorerWidth)) {
      setExplorerWidth(260);
      localStorage.setItem("repomind_explorer_width", "260");
    }
  }, [explorerWidth]);

  // Resize Explorer Drag Handler
  const handleExplorerResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingExplorer(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const sidebarLeft = sidebarContainerRef.current?.getBoundingClientRect().left ?? 0;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(240, Math.min(520, moveEvent.clientX - sidebarLeft));
      setExplorerWidth(newWidth);
      localStorage.setItem("repomind_explorer_width", String(newWidth));
    };

    const onMouseUp = () => {
      setIsResizingExplorer(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Resize Chat/Code Split Drag Handler
  const handleSplitResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSplit(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const containerRect = splitContainerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const offsetX = moveEvent.clientX - containerRect.left;
      const ratio = Math.max(0.2, Math.min(0.8, offsetX / containerRect.width));
      setChatSplitRatio(ratio);
      localStorage.setItem("repomind_chat_code_split", ratio.toFixed(3));
    };

    const onMouseUp = () => {
      setIsResizingSplit(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // Fetch files whenever repo changes
  const fetchFiles = useCallback(async () => {
    if (!repo?.id) {
      setRepoFiles([]);
      return;
    }
    setLoadingFiles(true);
    try {
      const res = await fetch(`/api/repos/${repo.id}/files`, {
        credentials: "include",
        headers: organizationId ? { "x-organization-id": organizationId } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setRepoFiles(data.files || []);
      }
    } catch (err) {
      console.warn("[AppShell] Failed to load repository files:", err);
    } finally {
      setLoadingFiles(false);
    }
  }, [repo?.id, organizationId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // When repo changes, clear active citation & conversation state
  useEffect(() => {
    setActiveSource(null);
    setActiveConversationId(`conv-${Date.now()}`);
  }, [repo?.id]);

  // Sync real conversation threads from backend if repo.id is provided
  useEffect(() => {
    if (!repo?.id) {
      if (conversations) setLocalConversations(conversations);
      return;
    }

    let isSubscribed = true;
    fetch(`/api/repos/${repo.id}/conversations`, {
      credentials: "include",
      headers: organizationId ? { "x-organization-id": organizationId } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isSubscribed) return;
        if (data && Array.isArray(data.conversations) && data.conversations.length > 0) {
          const items: ConversationItem[] = data.conversations.map((c: any) => ({
            id: c.id || c._id,
            title: c.title || "Untitled query",
            updatedAt: c.updatedAt
              ? new Date(c.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Active",
          }));
          setLocalConversations(items);
          setActiveConversationId(items[0].id);
        } else {
          setLocalConversations([]);
        }
      })
      .catch(() => {
        setLocalConversations([]);
      });

    return () => {
      isSubscribed = false;
    };
  }, [repo?.id, organizationId, conversations]);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobileMenuOpen]);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
    setActiveSource(null);
    setIsMobileMenuOpen(false);
  }, []);

  const handleNewChat = useCallback(() => {
    const newId = `conv-${Date.now()}`;
    setActiveConversationId(newId);
    setActiveSource(null);
    setIsMobileMenuOpen(false);
  }, []);

  const handleSelectSource = useCallback((citation: Citation) => {
    setActiveSource(citation);
    setActiveTab("code");
  }, []);

  const handleCloseViewer = useCallback(() => {
    setActiveSource(null);
    setActiveTab("chat");
  }, []);

  const handleSelectFile = useCallback((filePath: string) => {
    const newCitation: Citation = {
      id: `file-${filePath}`,
      label: "File",
      sourceKey: filePath,
      filePath: filePath,
      startLine: 1,
      endLine: 0,
      snippet: "",
    };
    setActiveSource(newCitation);
    setActiveTab("code");
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#080C14] text-slate-100 font-sans">
      {/* Topbar */}
      <Topbar
        repo={repo}
        repositories={repositories}
        onSelectRepo={onSelectRepo}
        onConnectNewRepo={onConnectNewRepo}
        onToggleMobileMenu={handleToggleMobileMenu}
        onExitShell={onExitShell}
        onOpenShowcase={onOpenShowcase}
      />

      {/* Workspace Body: Sidebar + Main Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Desktop Permanent Sidebar (>= 880px) */}
        <div
          ref={sidebarContainerRef}
          style={{ width: `${explorerWidth}px`, minWidth: `${explorerWidth}px`, maxWidth: `${explorerWidth}px` }}
          className="hidden shell-desktop:flex h-full shrink-0"
        >
          <Sidebar
            width={explorerWidth}
            isResizing={isResizingExplorer}
            currentRepoName={repo.name}
            currentRepoBranch={repo.branch}
            files={repoFiles}
            loadingFiles={loadingFiles}
            activeFilePath={activeSource?.filePath}
            onSelectFile={handleSelectFile}
            onRefreshFiles={fetchFiles}
            conversations={localConversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
          />
        </div>

        {/* Resizer Splitter between Explorer Sidebar and Main Canvas */}
        <div
          onMouseDown={handleExplorerResizeStart}
          onDoubleClick={() => {
            setExplorerWidth(260);
            localStorage.setItem("repomind_explorer_width", "260");
          }}
          className="hidden shell-desktop:flex w-2 -ml-1 z-30 cursor-col-resize items-center justify-center group relative select-none"
          title="Drag to resize Explorer (Double-click to reset 260px)"
        >
          <div
            className={`w-[2px] h-full transition-colors ${
              isResizingExplorer
                ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                : "bg-transparent group-hover:bg-indigo-500/70"
            }`}
          />
          {/* Subtle drag pill handle */}
          <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-8 rounded-full bg-[#111827] border border-white/[0.12] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 shadow-lg pointer-events-none">
            <div className="w-1 h-0.5 rounded-full bg-slate-400" />
            <div className="w-1 h-0.5 rounded-full bg-indigo-400" />
            <div className="w-1 h-0.5 rounded-full bg-slate-400" />
          </div>
        </div>

        {/* Mobile Navigation Drawer (< 880px) */}
        {isMobileMenuOpen && (
          <div
            className="shell-desktop:hidden fixed inset-0 z-40 flex"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation drawer"
          >
            {/* Backdrop Dismiss Overlay */}
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer Panel */}
            <div className="relative z-50 h-full w-[260px] bg-[#090D17] shadow-2xl">
              <Sidebar
                currentRepoName={repo.name}
                currentRepoBranch={repo.branch}
                files={repoFiles}
                loadingFiles={loadingFiles}
                activeFilePath={activeSource?.filePath}
                onSelectFile={handleSelectFile}
                onRefreshFiles={fetchFiles}
                conversations={localConversations}
                activeConversationId={activeConversationId}
                onSelectConversation={handleSelectConversation}
                onNewChat={handleNewChat}
              />
            </div>
          </div>
        )}

        {/* Central Workspace Canvas */}
        <main className={`flex-1 flex flex-col overflow-hidden bg-[#080C14] ${isResizingExplorer ? "pointer-events-none select-none" : ""}`}>
          {children ? (
            children
          ) : (
            <>
              {/* Mobile Two-Tab Switcher (< 880px) */}
              <div className="shell-desktop:hidden h-10 bg-[#0B101B] border-b border-white/[0.07] flex items-center justify-between px-3 shrink-0">
                <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08]" role="tablist" aria-label="Workspace views">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "chat"}
                    onClick={() => setActiveTab("chat")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      activeTab === "chat"
                        ? "bg-indigo-600 text-white font-semibold shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === "code"}
                    onClick={() => setActiveTab("code")}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      activeTab === "code"
                        ? "bg-indigo-600 text-white font-semibold shadow-xs"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Code</span>
                    {activeSource && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    )}
                  </button>
                </div>

                {activeTab === "code" && activeSource && (
                  <span className="text-[11px] font-mono text-slate-400 truncate max-w-[140px]">
                    {activeSource.filePath.split("/").pop()}
                  </span>
                )}
              </div>

              {/* Mobile Single Active Tab View (< 880px) */}
              <div className="shell-desktop:hidden flex-1 flex overflow-hidden">
                {activeTab === "chat" ? (
                  <div className="flex-1 h-full min-w-0">
                    <ChatPane
                      repoId={repo?.id}
                      organizationId={organizationId}
                      conversationId={activeConversationId}
                      activeSource={activeSource}
                      onSelectSource={handleSelectSource}
                      onConversationCreated={(id) => {
                        setActiveConversationId(id);
                        setLocalConversations((prev) => [
                          { id, title: "Active Query", updatedAt: "Just now" },
                          ...prev.filter((c) => c.id !== id),
                        ]);
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex-1 h-full min-w-0">
                    <CodeViewer
                      repoId={repo?.id}
                      repoFullName={repo?.fullName}
                      organizationId={organizationId}
                      source={activeSource}
                      onClose={handleCloseViewer}
                    />
                  </div>
                )}
              </div>

              {/* Desktop Side-by-Side View (>= 880px) */}
              <div
                ref={splitContainerRef}
                className="hidden shell-desktop:flex flex-1 h-full overflow-hidden relative"
              >
                {/* Chat Pane */}
                <div
                  style={{ width: `${chatSplitRatio * 100}%` }}
                  className={`h-full min-w-[260px] overflow-hidden ${isResizingSplit ? "pointer-events-none" : ""}`}
                >
                  <ChatPane
                    repoId={repo?.id}
                    organizationId={organizationId}
                    conversationId={activeConversationId}
                    activeSource={activeSource}
                    onSelectSource={handleSelectSource}
                    onConversationCreated={(id) => {
                      setActiveConversationId(id);
                      setLocalConversations((prev) => [
                        { id, title: "Active Query", updatedAt: "Just now" },
                        ...prev.filter((c) => c.id !== id),
                      ]);
                    }}
                  />
                </div>

                {/* Resizer Splitter between Chat and CodeViewer */}
                <div
                  onMouseDown={handleSplitResizeStart}
                  onDoubleClick={() => {
                    setChatSplitRatio(0.5);
                    localStorage.setItem("repomind_chat_code_split", "0.500");
                  }}
                  className="w-2.5 -mx-1 z-30 cursor-col-resize flex items-center justify-center group relative select-none bg-transparent"
                  title="Drag to resize Chat and Code panels (Double-click to reset 50/50)"
                >
                  <div
                    className={`w-[2px] h-full transition-colors ${
                      isResizingSplit
                        ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                        : "bg-white/[0.08] group-hover:bg-indigo-500/80"
                    }`}
                  />
                  {/* Subtle drag pill handle */}
                  <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-9 rounded-full bg-[#111827] border border-white/[0.12] opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 shadow-xl pointer-events-none">
                    <div className="w-1 h-0.5 rounded-full bg-indigo-400" />
                    <div className="w-1 h-0.5 rounded-full bg-cyan-400" />
                    <div className="w-1 h-0.5 rounded-full bg-indigo-400" />
                  </div>
                </div>

                {/* Code Viewer */}
                <div
                  style={{ width: `${(1 - chatSplitRatio) * 100}%` }}
                  className={`h-full min-w-[260px] overflow-hidden ${isResizingSplit ? "pointer-events-none" : ""}`}
                >
                  <CodeViewer
                    repoId={repo?.id}
                    repoFullName={repo?.fullName}
                    organizationId={organizationId}
                    source={activeSource}
                    onClose={handleCloseViewer}
                  />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
