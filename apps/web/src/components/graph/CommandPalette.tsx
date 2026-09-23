import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  FileCode,
  Zap,
  History,
  ArrowRight,
  Code2,
} from "lucide-react";
import type { GraphNode } from "@repomind/shared-types";

interface CommandPaletteProps {
  nodes: GraphNode[];
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (node: GraphNode) => void;
  onAnalyzeImpact: (node: GraphNode) => void;
  onWhyExists: (node: GraphNode) => void;
  onOpenCode: (filePath: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  nodes,
  isOpen,
  onClose,
  onSelectNode,
  onAnalyzeImpact,
  onWhyExists,
  onOpenCode,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Filter items based on query
  const filteredNodes = React.useMemo(() => {
    if (!query.trim()) return nodes.slice(0, 8);
    const q = query.toLowerCase();
    return nodes
      .filter((n) => n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q))
      .slice(0, 10);
  }, [nodes, query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredNodes.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredNodes.length) % Math.max(1, filteredNodes.length));
      } else if (e.key === "Enter" && filteredNodes[selectedIndex]) {
        e.preventDefault();
        onSelectNode(filteredNodes[selectedIndex]);
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredNodes, selectedIndex, onClose, onSelectNode]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-950/80 backdrop-blur-sm p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-slate-900 border border-white/[0.1] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 flex flex-col"
      >
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-white/[0.08] flex items-center gap-3 bg-slate-950/60">
          <Search className="w-4 h-4 text-indigo-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search repository files, symbols, and actions (e.g. 'userService')..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none font-sans"
          />
          <kbd className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-400 border border-white/[0.08]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredNodes.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">No matching files or symbols found.</div>
          ) : (
            filteredNodes.map((node, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={node.id}
                  onClick={() => {
                    onSelectNode(node);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition ${
                    isSelected ? "bg-indigo-600/20 border border-indigo-500/30" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCode className={`w-4 h-4 ${isSelected ? "text-indigo-400" : "text-slate-400"}`} />
                    <div>
                      <div className="text-xs font-bold text-white font-mono flex items-center gap-2">
                        <span>{node.name}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-sans">
                          {node.type}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-sm">{node.path}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnalyzeImpact(node);
                        onClose();
                      }}
                      title="Analyze Impact"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onWhyExists(node);
                        onClose();
                      }}
                      title="Why Exists?"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCode(node.path);
                        onClose();
                      }}
                      title="Open Code"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                    </button>
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? "text-indigo-400" : "text-slate-600"}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-white/[0.08] bg-slate-950/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>↑↓ Navigate</span>
          <span>↵ Open in Graph</span>
          <span>⚡ Impact Analysis</span>
        </div>
      </div>
    </div>
  );
};
