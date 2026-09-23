import React from "react";
import {
  X,
  FileCode,
  ArrowRight,
  ExternalLink,
  Code2,
} from "lucide-react";
import type { GraphEdge, GraphNode } from "@repomind/shared-types";

interface RelationshipEdgeModalProps {
  edge: GraphEdge | null;
  nodes: GraphNode[];
  isOpen: boolean;
  onClose: () => void;
  onOpenCodeLine: (filePath: string, line?: number) => void;
}

export const RelationshipEdgeModal: React.FC<RelationshipEdgeModalProps> = ({
  edge,
  nodes,
  isOpen,
  onClose,
  onOpenCodeLine,
}) => {
  if (!isOpen || !edge) return null;

  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);

  const sourceName = sourceNode?.name || edge.source;
  const targetName = targetNode?.name || edge.target;

  const evidence = edge.evidence;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0B101B] border border-white/[0.09] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150 flex flex-col font-sans select-none">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between bg-[#080C14]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Code2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white font-mono">Dependency Relationship</h2>
              <p className="text-[10px] text-slate-400">Deterministic static code reference</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Relationship Connection Card */}
          <div className="p-4 rounded-xl bg-slate-950 border border-white/[0.08] flex items-center justify-between gap-3">
            <div className="truncate flex-1">
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-mono">
                Source Module
              </span>
              <strong className="text-xs text-white font-mono truncate block" title={sourceNode?.path}>
                {sourceName}
              </strong>
            </div>

            <div className="flex flex-col items-center justify-center px-3">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono border border-indigo-500/30">
                {edge.type}
              </span>
              <ArrowRight className="w-4 h-4 text-indigo-400 mt-1" />
            </div>

            <div className="truncate flex-1 text-right">
              <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-mono">
                Target Dependency
              </span>
              <strong className="text-xs text-white font-mono truncate block" title={targetNode?.path}>
                {targetName}
              </strong>
            </div>
          </div>

          {/* Code Snippet Evidence */}
          {evidence ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Exact Source Location:</span>
                <span className="text-indigo-300">
                  {evidence.sourcePath}:{evidence.sourceLine || 1}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/20 font-mono text-xs text-slate-200 overflow-x-auto">
                <code className="text-indigo-300">{evidence.sourceSnippet || `import from "${evidence.targetPath}"`}</code>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-950/60 border border-white/[0.05] text-xs text-slate-400 italic">
              Direct relationship inferred from module import hierarchy.
            </div>
          )}

          {/* Jump to Line Button */}
          {evidence?.sourcePath && (
            <button
              onClick={() => {
                onOpenCodeLine(evidence.sourcePath, evidence.sourceLine);
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-500/20 cursor-pointer"
            >
              <FileCode className="w-4 h-4" />
              <span>Jump to Line {evidence.sourceLine || 1} in Monaco Viewer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Deterministic AST relation</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
