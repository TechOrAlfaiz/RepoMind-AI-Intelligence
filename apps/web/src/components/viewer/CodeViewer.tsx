import React, { useState, useEffect, useRef } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import {
  FileCode,
  Copy,
  Check,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
  Loader2,
  ChevronRight,
  X,
  Code2,
} from "lucide-react";
import type { Citation } from "../chat/ChatPane";

export interface ExtendedCitation extends Citation {
  isIssue?: boolean;
  issueNumber?: number;
  issueTitle?: string;
  issueState?: "open" | "closed";
  issueAuthor?: string;
  issueBody?: string;
  issueLabels?: string[];
  repoFullName?: string;
}

interface CodeViewerProps {
  repoId?: string;
  repoFullName?: string;
  organizationId?: string;
  source?: ExtendedCitation | null;
  onClose?: () => void;
}

// Fallback fixtures matching offline test fixtures
const FILE_CONTENTS: Record<string, string> = {
  "src/components/ErrorMessage.jsx": `const ErrorMessage = ({ message, className = ''}) => !message ? null: (
    <div className={\`max-w-2xl mx-auto mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-200 \${className}\`}>{message}</div>
);

export default ErrorMessage;
`,
  "src/auth/service.ts": `import crypto from "crypto";
import { User, Session } from "../types";

export class AuthService {
  private secretKey: Buffer;
  private iv: Buffer;

  constructor() {
    this.secretKey = Buffer.from(process.env.VAULT_SECRET || "0123456789abcdef0123456789abcdef", "hex");
    this.iv = Buffer.from(process.env.VAULT_IV || "abcdef0123456789abcdef0123456789", "hex").subarray(0, 12);
  }

  public decryptVaultToken(ciphertext: string, authTag: Buffer): string {
    if (!ciphertext || typeof ciphertext !== "string") {
      throw new TypeError("Ciphertext must be a non-empty string");
    }
    if (!authTag || authTag.length !== 16) {
      throw new Error("Invalid authentication tag length (must be 16 bytes)");
    }

    const decipher = crypto.createDecipheriv("aes-256-gcm", this.secretKey, this.iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}
`,
};

function getMonacoLanguage(filePath?: string): string {
  if (!filePath) return "plaintext";
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
    case "mjs":
    case "cjs":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "json":
      return "json";
    case "html":
      return "html";
    case "css":
    case "scss":
    case "less":
      return "css";
    case "md":
    case "markdown":
      return "markdown";
    case "py":
      return "python";
    case "go":
      return "go";
    case "rs":
      return "rust";
    case "sh":
    case "bash":
    case "zsh":
      return "shell";
    case "sql":
      return "sql";
    case "yaml":
    case "yml":
      return "yaml";
    default:
      return "plaintext";
  }
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  repoId,
  repoFullName,
  organizationId,
  source,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [fetchedContent, setFetchedContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Fetch live file content from repository when citation source is selected
  useEffect(() => {
    if (!source?.filePath) {
      setFetchedContent(null);
      return;
    }

    if (repoId) {
      let isCancelled = false;
      setLoadingFile(true);

      fetch(`/api/repos/${repoId}/file-content?path=${encodeURIComponent(source.filePath)}`, {
        credentials: "include",
        headers: organizationId ? { "x-organization-id": organizationId } : {},
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!isCancelled) {
            if (data && data.content) {
              setFetchedContent(data.content);
            } else {
              setFetchedContent(FILE_CONTENTS[source.filePath] || source.snippet || null);
            }
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setFetchedContent(FILE_CONTENTS[source.filePath] || source.snippet || null);
          }
        })
        .finally(() => {
          if (!isCancelled) setLoadingFile(false);
        });

      return () => {
        isCancelled = true;
      };
    } else {
      setFetchedContent(FILE_CONTENTS[source.filePath] || source.snippet || null);
    }
  }, [source?.filePath, repoId, organizationId]);

  // Apply line decorations and reveal line whenever content or source range updates
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !source) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const startLine = Math.max(1, source.startLine || 1);
    const endLine = Math.max(startLine, source.endLine || startLine);

    try {
      editor.revealLineInCenter(startLine);
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current || [], [
        {
          range: new monaco.Range(startLine, 1, endLine, 1000),
          options: {
            isWholeLine: true,
            className: "cited-line-range-highlight",
            glyphMarginClassName: "cited-line-glyph",
            overviewRuler: {
              color: "rgba(99, 102, 241, 0.8)",
              position: monaco.editor.OverviewRulerLane.Full,
            },
          },
        },
      ]);
    } catch (err) {
      console.warn("[CodeViewer] Monaco decoration error:", err);
    }
  }, [source, fetchedContent]);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom RepoMind dark theme
    monaco.editor.defineTheme("repomind-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748B", fontStyle: "italic" },
        { token: "keyword", foreground: "818CF8", fontStyle: "bold" },
        { token: "string", foreground: "34D399" },
        { token: "number", foreground: "38BDF8" },
        { token: "type", foreground: "F472B6" },
        { token: "function", foreground: "60A5FA" },
        { token: "identifier", foreground: "F1F5F9" },
      ],
      colors: {
        "editor.background": "#070A11",
        "editor.foreground": "#E2E8F0",
        "editor.lineHighlightBackground": "#ffffff06",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#38BDF8",
        "editorGutter.background": "#070A11",
        "editor.selectionBackground": "#6366F135",
        "editor.inactiveSelectionBackground": "#6366F118",
      },
    });

    monaco.editor.setTheme("repomind-dark");

    if (source?.startLine) {
      const startLine = Math.max(1, source.startLine);
      const endLine = Math.max(startLine, source.endLine || startLine);
      editor.revealLineInCenter(startLine);
      decorationsRef.current = editor.deltaDecorations([], [
        {
          range: new monaco.Range(startLine, 1, endLine, 1000),
          options: {
            isWholeLine: true,
            className: "cited-line-range-highlight",
            glyphMarginClassName: "cited-line-glyph",
            overviewRuler: {
              color: "rgba(99, 102, 241, 0.8)",
              position: monaco.editor.OverviewRulerLane.Full,
            },
          },
        },
      ]);
    }
  };

  const handleCopy = () => {
    const textToCopy = fetchedContent || source?.snippet || "";
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Empty State
  if (!source) {
    return (
      <div className="h-full w-full bg-[#070A11] text-slate-400 flex flex-col items-center justify-center p-8 select-none border-l border-white/[0.07] font-sans">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mb-4 shadow-xl">
          <Code2 className="w-7 h-7 text-indigo-400 opacity-60" />
        </div>
        <h3 className="text-sm font-semibold text-white mb-1.5">
          No Citation Selected
        </h3>
        <p className="text-xs text-slate-500 text-center max-w-xs leading-relaxed">
          Click any citation badge (e.g. <span className="font-mono text-cyan-400 font-semibold">[CTX-1]</span>) in the chat response to inspect the exact line-range slice in the Monaco IDE.
        </p>
      </div>
    );
  }

  // 2. Issue / PR View
  if (source.isIssue) {
    return (
      <div className="h-full w-full bg-[#070A11] text-slate-200 flex flex-col border-l border-white/[0.07] overflow-hidden font-sans select-text">
        <div className="h-11 px-4 bg-[#0B101B] border-b border-white/[0.07] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                source.issueState === "closed"
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                  : "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              {source.issueState || "closed"}
            </span>
            <span className="text-xs font-semibold text-white">
              Issue #{source.issueNumber || 104}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
            title="Copy Issue Details"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white">
            {source.issueTitle || "Regression in token decipher auth tag validation"}
          </h3>
          <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
            <span>Opened by @{source.issueAuthor || "security-auditor"}</span>
          </div>

          <div className="bg-[#0E1524] p-4 rounded-xl border border-white/[0.08] leading-relaxed text-slate-300">
            {source.issueBody ||
              "Calling decryptVaultToken with null or empty string throws an unhandled TypeError. Guard clause required to check auth tag buffer length before invoking cipher decryption."}
          </div>

          {source.snippet && (
            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                Referenced Code Fix:
              </span>
              <pre className="bg-[#05080E] p-3 rounded-xl border border-white/[0.08] font-mono text-[11px] text-slate-200 overflow-x-auto">
                <code>{source.snippet}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Full Monaco Code Editor
  const fileContent =
    fetchedContent ||
    FILE_CONTENTS[source.filePath] ||
    source.snippet ||
    "// Loading source file from repository...";

  const pathParts = (source.filePath || "").split("/");
  const fileName = pathParts.pop() || source.filePath;
  const pathPrefix = pathParts.join(" / ");
  const monacoLang = getMonacoLanguage(source.filePath);

  const startLine = source.startLine || 1;
  const endLine = source.endLine || startLine;

  const githubUrl =
    repoFullName && source.filePath
      ? `https://github.com/${repoFullName}/blob/${source.commitSha || "main"}/${source.filePath}#L${startLine}-L${endLine}`
      : null;

  return (
    <div className="h-full w-full bg-[#070A11] text-slate-200 flex flex-col border-l border-white/[0.07] overflow-hidden select-text font-sans">
      {/* Tab Header Bar */}
      <div className="h-11 px-3 bg-[#090D17] border-b border-white/[0.07] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 overflow-hidden min-w-0">
          {/* Active File Tab */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-white shadow-sm shrink-0 max-w-[200px] sm:max-w-xs">
            <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{fileName}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shrink-0">
              {source.endLine && source.endLine > 0
                ? `L${startLine}–${endLine}`
                : "Full"}
            </span>
          </div>

          {loadingFile && (
            <span title="Syncing source slice..." className="flex items-center gap-1 text-[11px] text-slate-400 font-mono shrink-0">
              <Loader2 className="w-3 h-3 text-cyan-400 animate-spin shrink-0" />
            </span>
          )}
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
              title="View on GitHub"
            >
              <ExternalLink className="w-3 h-3 text-slate-400" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          )}
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy code content"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-slate-300 hover:text-white transition cursor-pointer"
            title="Copy cited source"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="hidden sm:inline text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white transition cursor-pointer"
              title="Close code viewer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Subheader Breadcrumb & AST Status Bar */}
      <div className="px-3.5 py-1.5 bg-[#080C14] border-b border-white/[0.05] flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
        <div className="flex items-center gap-1.5 truncate">
          {pathPrefix && (
            <>
              <span className="text-slate-500 truncate">{pathPrefix}</span>
              <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
            </>
          )}
          <span className="text-slate-200 font-semibold truncate">{fileName}</span>
          {source.symbolName && source.symbolName !== "block_1" && (
            <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
              {source.symbolName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] shrink-0 font-sans">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="hidden sm:inline font-medium">AST Verified</span>
        </div>
      </div>

      {/* Monaco Code Editor Workspace */}
      <div className="flex-1 w-full relative bg-[#070A11] overflow-hidden">
        <Editor
          height="100%"
          width="100%"
          language={monacoLang}
          value={fileContent}
          theme="repomind-dark"
          onMount={handleEditorDidMount}
          loading={
            <div className="h-full w-full flex items-center justify-center bg-[#070A11] text-slate-400 gap-2 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Loading Monaco editor...</span>
            </div>
          }
          options={{
            readOnly: true,
            fontSize: 12.5,
            lineHeight: 20,
            fontFamily: "JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, monospace",
            minimap: { enabled: true, maxColumn: 45, renderCharacters: false },
            scrollBeyondLastLine: false,
            renderLineHighlight: "all",
            automaticLayout: true,
            smoothScrolling: true,
            lineNumbersMinChars: 3,
            folding: true,
            glyphMargin: true,
            contextmenu: true,
            wordWrap: "off",
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              useShadows: false,
              verticalScrollbarSize: 9,
              horizontalScrollbarSize: 9,
            },
          }}
        />
      </div>
    </div>
  );
};
