import React, { useState, useMemo } from "react";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileCode,
  FileText,
  File,
  Search,
  RefreshCw,
  ChevronsUpDown,
} from "lucide-react";
import type { FileRecord } from "@repomind/shared-types";

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  size?: number;
  language?: string;
}

interface RepoFileExplorerProps {
  files: FileRecord[];
  activeFilePath?: string | null;
  loading?: boolean;
  onSelectFile: (filePath: string) => void;
  onRefresh?: () => void;
}

function buildFileTree(files: FileRecord[]): FileNode[] {
  const root: FileNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    let currentLevel = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      let existing = currentLevel.find((node) => node.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "directory",
          children: isFile ? undefined : [],
          size: isFile ? file.size : undefined,
          language: isFile ? file.language : undefined,
        };
        currentLevel.push(existing);
      }

      if (!isFile && existing.children) {
        currentLevel = existing.children;
      }
    }
  }

  // Sort directories first, then alphabetical
  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "directory" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) {
      if (node.children) sortNodes(node.children);
    }
  };

  sortNodes(root);
  return root;
}

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "ts":
      return <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    case "jsx":
    case "js":
      return <FileCode className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
    case "json":
      return <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case "md":
    case "txt":
      return <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    case "css":
    case "scss":
      return <FileCode className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
    case "html":
      return <FileCode className="w-3.5 h-3.5 text-orange-400 shrink-0" />;
    default:
      return <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
  }
}

export const RepoFileExplorer: React.FC<RepoFileExplorerProps> = ({
  files,
  activeFilePath,
  loading = false,
  onSelectFile,
  onRefresh,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    // Default open top-level directories
    const initial = new Set<string>();
    files.forEach((f) => {
      const parts = f.path.split("/");
      if (parts.length > 1) {
        initial.add(parts[0]);
        if (parts.length > 2) initial.add(`${parts[0]}/${parts[1]}`);
      }
    });
    return initial;
  });

  const tree = useMemo(() => buildFileTree(files), [files]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (expandedFolders.size > 0) {
      setExpandedFolders(new Set());
    } else {
      const allFolders = new Set<string>();
      const collect = (nodes: FileNode[]) => {
        nodes.forEach((n) => {
          if (n.type === "directory") {
            allFolders.add(n.path);
            if (n.children) collect(n.children);
          }
        });
      };
      collect(tree);
      setExpandedFolders(allFolders);
    }
  };

  // Filter matching nodes when search query is entered
  const filterNodes = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query) return nodes;
    const lower = query.toLowerCase();

    return nodes
      .map((node) => {
        if (node.type === "file") {
          return node.name.toLowerCase().includes(lower) || node.path.toLowerCase().includes(lower)
            ? node
            : null;
        }
        // Directory: check if directory itself matches or any of its children match
        const matchingChildren = node.children ? filterNodes(node.children, query) : [];
        if (matchingChildren.length > 0 || node.name.toLowerCase().includes(lower)) {
          return {
            ...node,
            children: matchingChildren,
          };
        }
        return null;
      })
      .filter((n): n is FileNode => n !== null);
  };

  const filteredTree = useMemo(() => {
    return filterNodes(tree, searchQuery);
  }, [tree, searchQuery]);

  const renderTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => {
      const isDir = node.type === "directory";
      const isExpanded = expandedFolders.has(node.path) || Boolean(searchQuery);
      const isActive = activeFilePath === node.path;

      return (
        <div key={node.path}>
          <div
            onClick={() => {
              if (isDir) {
                toggleFolder(node.path);
              } else {
                onSelectFile(node.path);
              }
            }}
            style={{ paddingLeft: `${Math.max(level * 12 + 6, 6)}px` }}
            className={`flex items-center gap-1.5 py-1.5 pr-2 rounded-lg text-xs font-mono transition-all cursor-pointer select-none group ${
              isActive
                ? "bg-indigo-600/25 text-white font-medium border border-indigo-500/40 shadow-sm shadow-indigo-500/10"
                : "text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
            }`}
            title={node.path}
          >
            {/* Directory expand caret */}
            {isDir ? (
              <span className="w-3.5 h-3.5 flex items-center justify-center text-slate-500 group-hover:text-slate-300 shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </span>
            ) : (
              <span className="w-3.5 shrink-0" />
            )}

            {/* Folder or File Icon */}
            {isDir ? (
              isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-indigo-400/80 shrink-0" />
              )
            ) : (
              getFileIcon(node.name)
            )}

            {/* File / Folder Name */}
            <span className="truncate flex-1 tracking-tight">{node.name}</span>

            {/* Active file indicator */}
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)] shrink-0" />
            )}
          </div>

          {/* Render children if directory is expanded */}
          {isDir && isExpanded && node.children && node.children.length > 0 && (
            <div className="border-l border-[#1F293D]/70 ml-2.5">
              {renderTree(node.children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none bg-[#080C14]">
      {/* Explorer Controls: Search & Collapse All */}
      <div className="p-2 border-b border-[#1F293D] space-y-1.5">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0B101B] border border-[#1F293D] text-xs">
            <Search className="w-3 h-3 text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Filter files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-slate-200 outline-none w-full placeholder:text-slate-600 text-xs font-mono"
            />
          </div>

          <button
            type="button"
            onClick={toggleAll}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#162032] border border-[#1F293D] transition"
            title={expandedFolders.size > 0 ? "Collapse All Folders" : "Expand All Folders"}
          >
            <ChevronsUpDown className="w-3 h-3" />
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#162032] border border-[#1F293D] transition"
              title="Refresh File Tree"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1">
          <span>{files.length} indexed files</span>
          <span>AST Tree</span>
        </div>
      </div>

      {/* Tree Content Area */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
        {loading && files.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 font-mono space-y-2">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400 mx-auto" />
            <div>Loading repository tree...</div>
          </div>
        ) : filteredTree.length > 0 ? (
          renderTree(filteredTree)
        ) : (
          <div className="p-6 text-center text-xs text-slate-500 font-mono">
            {searchQuery ? `No files match "${searchQuery}"` : "No files indexed in repository"}
          </div>
        )}
      </div>
    </div>
  );
};
