import React, { useState, useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  FileCode,
  GitCommit,
  Copy,
  Check,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import type { ValidatedCitation } from "@repomind/shared-types";
import { useRepo } from "../../context/RepoContext";

interface CodeViewerModalProps {
  repoId: string;
  repoName: string;
  citation: ValidatedCitation;
  onClose: () => void;
}

export const CodeViewerModal: React.FC<CodeViewerModalProps> = ({
  repoId,
  repoName,
  citation,
  onClose,
}) => {
  const { fetchFileContent } = useRepo();
  const [fileData, setFileData] = useState<{
    path: string;
    content: string;
    language: string;
    commitSha?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    loadFile();
  }, [repoId, citation.filePath]);

  const loadFile = async () => {
    setLoading(true);
    const data = await fetchFileContent(repoId, citation.filePath);
    if (data) {
      setFileData(data);
    } else {
      // Fallback: populate with the snippet if file cannot be retrieved
      setFileData({
        path: citation.filePath,
        content: citation.snippet,
        language: "typescript",
        commitSha: citation.commitSha || "HEAD",
      });
    }
    setLoading(false);
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Reveal the cited line in the center of the editor viewport
    editor.revealLineInCenter(citation.startLine);

    // Apply delta decorations to highlight the exact cited line range
    editor.deltaDecorations(
      [],
      [
        {
          range: new monaco.Range(
            citation.startLine,
            1,
            citation.endLine,
            1000,
          ),
          options: {
            isWholeLine: true,
            className: "cited-line-range-highlight",
            glyphMarginClassName: "cited-line-glyph",
            overviewRuler: {
              color: "rgba(16, 185, 129, 0.7)",
              position: monaco.editor.OverviewRulerLane.Full,
            },
          },
        },
      ],
    );
  };

  const handleCopyContent = () => {
    if (fileData?.content) {
      navigator.clipboard.writeText(fileData.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Map language string to Monaco supported language ID
  const getMonacoLanguage = (lang?: string) => {
    const l = (lang || "").toLowerCase();
    if (l === "typescript" || l === "ts" || l === "tsx") return "typescript";
    if (l === "javascript" || l === "js" || l === "jsx") return "javascript";
    if (l === "python" || l === "py") return "python";
    if (l === "json") return "json";
    if (l === "markdown" || l === "md") return "markdown";
    if (l === "html") return "html";
    if (l === "css") return "css";
    if (l === "shell" || l === "bash" || l === "sh") return "shell";
    if (l === "sql") return "sql";
    if (l === "go") return "go";
    if (l === "rust") return "rust";
    return "plaintext";
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Navigation / Breadcrumb Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white font-mono">
                  {citation.filePath}
                </span>
                <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  lines {citation.startLine}–{citation.endLine}
                </span>
                {citation.symbolName && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {citation.symbolName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>Repository:</span>
                <span className="text-slate-300 font-mono">{repoName}</span>
                <span>&bull;</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <GitCommit className="w-3 h-3 text-indigo-400" />
                  SHA:{" "}
                  <span className="font-mono text-indigo-300 font-semibold">
                    {fileData?.commitSha ? fileData.commitSha.substring(0, 7) : "HEAD"}
                  </span>
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyContent}
              title="Copy entire file"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition flex items-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex-1 relative bg-slate-950 overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Loading file from repository index...</span>
            </div>
          ) : (
            <Editor
              height="100%"
              theme="vs-dark"
              language={getMonacoLanguage(fileData?.language)}
              value={fileData?.content || ""}
              onMount={handleEditorDidMount}
              options={{
                readOnly: true,
                domReadOnly: true,
                lineNumbers: "on",
                minimap: { enabled: true },
                scrollBeyondLastLine: false,
                fontSize: 13,
                fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, monospace",
                fontLigatures: true,
                renderLineHighlight: "all",
                automaticLayout: true,
                wordWrap: "off",
              }}
            />
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>Language: {fileData?.language || "Unknown"}</span>
            <span>&bull;</span>
            <span>
              Total Lines: {fileData?.content ? fileData.content.split("\n").length : 0}
            </span>
            <span>&bull;</span>
            <span className="text-emerald-400">
              Highlighted: {citation.startLine}–{citation.endLine}
            </span>
          </div>
          <span className="text-slate-400">Monaco Read-Only Engine</span>
        </div>
      </div>
    </div>
  );
};
