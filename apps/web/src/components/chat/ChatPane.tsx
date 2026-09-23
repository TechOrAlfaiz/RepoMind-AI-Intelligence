import React, { useState, useRef, useEffect, useCallback } from "react";
import { FileCode, Clock, AlertCircle, Loader2, Sparkles, Copy, Check, Terminal, CornerDownLeft } from "lucide-react";

export interface Citation {
  id: string;
  label: string;
  sourceKey: string;
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string;
  snippet?: string;
  commitSha?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  createdAt?: string;
  isStreaming?: boolean;
}

interface ChatPaneProps {
  repoId?: string;
  organizationId?: string;
  conversationId?: string;
  messages?: Message[];
  activeSource?: Citation | null;
  onSelectSource?: (citation: Citation) => void;
  onSendMessage?: (content: string) => void;
  onConversationCreated?: (conversationId: string) => void;
}

const SUGGESTED_QUERIES = [
  "Explain the project entrypoint and key modules",
  "What dependencies and scripts are configured?",
  "Find potential security or performance bottlenecks",
];

export const ChatPane: React.FC<ChatPaneProps> = ({
  repoId,
  organizationId,
  conversationId,
  messages: externalMessages,
  activeSource,
  onSelectSource,
  onSendMessage,
  onConversationCreated,
}) => {
  const [messages, setMessages] = useState<Message[]>(externalMessages ?? []);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync external messages prop if provided
  useEffect(() => {
    if (externalMessages) {
      setMessages(externalMessages);
    }
  }, [externalMessages]);

  // Load conversation messages from backend when conversationId changes
  const loadConversationMessages = useCallback(async () => {
    if (!repoId || !conversationId || conversationId.startsWith("conv-")) return;
    try {
      const res = await fetch(`/api/repos/${repoId}/conversations/${conversationId}/messages`, {
        credentials: "include",
        headers: organizationId ? { "x-organization-id": organizationId } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          const mapped: Message[] = data.messages.map((m: any) => ({
            id: m.id || m._id,
            role: m.role,
            content: m.content,
            citations: (m.citations || []).map((c: any, idx: number) => ({
              id: c.chunkId || `cit-${idx}`,
              label: `[CTX-${c.contextIndex || idx + 1}]`,
              sourceKey: `${c.filePath}:${c.startLine}-${c.endLine}`,
              filePath: c.filePath,
              startLine: c.startLine,
              endLine: c.endLine,
              symbolName: c.symbolName,
              snippet: c.snippet,
              commitSha: c.commitSha,
            })),
            createdAt: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
          }));
          setMessages(mapped);
        }
      }
    } catch (err) {
      console.warn("[RepoMind ChatPane] Could not load past conversation messages:", err);
    }
  }, [repoId, conversationId, organizationId]);

  useEffect(() => {
    loadConversationMessages();
  }, [loadConversationMessages]);

  // Auto-scroll on new message or streaming token
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = async (queryText?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = (queryText || inputText).trim();
    if (!text) {
      setInputError("Please enter a question about this repository.");
      return;
    }
    if (isStreaming) return;
    setInputError(null);

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text,
      citations: [],
      createdAt: "Just now",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    onSendMessage?.(text);

    // If real repoId is available, stream from backend RAG API
    if (repoId) {
      setIsStreaming(true);
      const assistantMsgId = `asst-${Date.now()}`;
      const placeholderMsg: Message = {
        id: assistantMsgId,
        role: "assistant",
        content: "",
        citations: [],
        createdAt: "Just now",
        isStreaming: true,
      };
      setMessages((prev) => [...prev, placeholderMsg]);

      try {
        const res = await fetch(`/api/repos/${repoId}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...(organizationId ? { "x-organization-id": organizationId } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            query: text,
            conversationId: conversationId && !conversationId.startsWith("conv-") ? conversationId : undefined,
            activeFilePath: activeSource?.filePath,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Chat request failed (HTTP ${res.status}): ${res.statusText}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let accumulatedText = "";
        const accumulatedCitations: Citation[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.type === "token") {
                  accumulatedText += event.payload;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: accumulatedText, isStreaming: true }
                        : m
                    )
                  );
                } else if (event.type === "citation") {
                  const c = event.payload;
                  const newCitation: Citation = {
                    id: c.chunkId || `cit-${Date.now()}-${accumulatedCitations.length}`,
                    label: `[CTX-${c.contextIndex || accumulatedCitations.length + 1}]`,
                    sourceKey: `${c.filePath}:${c.startLine}-${c.endLine}`,
                    filePath: c.filePath,
                    startLine: c.startLine,
                    endLine: c.endLine,
                    symbolName: c.symbolName,
                    snippet: c.snippet,
                    commitSha: c.commitSha,
                  };
                  accumulatedCitations.push(newCitation);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, citations: [...accumulatedCitations] }
                        : m
                    )
                  );
                  if (!activeSource && accumulatedCitations.length === 1) {
                    onSelectSource?.(newCitation);
                  }
                } else if (event.type === "done") {
                  if (event.payload?.conversationId) {
                    onConversationCreated?.(event.payload.conversationId);
                  }
                }
              } catch (parseErr) {
                console.warn("[RepoMind ChatPane] Error parsing SSE frame:", parseErr);
              }
            }
          }
        }

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: accumulatedText, citations: accumulatedCitations, isStreaming: false }
              : m
          )
        );
      } catch (err: any) {
        console.error("[RepoMind ChatPane] SSE Stream failed:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: `Error connecting to RAG stream: ${err.message}. Please verify the repository index is ready.`,
                  isStreaming: false,
                }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    } else {
      // Offline fallback
      setTimeout(() => {
        const assistantMessage: Message = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: `In \`src/App.jsx\` (lines 1–25), the application router and view layout are defined [CTX-1].`,
          citations: [
            {
              id: "cit-offline-1",
              label: "[CTX-1]",
              sourceKey: "src/App.jsx:1-25",
              filePath: "src/App.jsx",
              startLine: 1,
              endLine: 25,
              symbolName: "App",
              snippet: "export default function App() {\n  return <Dashboard />;\n}",
            },
          ],
          createdAt: "Just now",
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }, 500);
    }
  };

  /**
   * Helper to parse inline tokens: Citations, Bold, and Inline Code
   */
  const renderInlineSpans = (text: string, citations: Citation[], keyPrefix: string) => {
    // Matches: [CTX-1], **bold**, or `inline code`
    const inlineRegex = /(\[(?:CTX-)?\d+\]|\*\*[^*]+?\*\*|`[^`]+?`)/g;
    const parts = text.split(inlineRegex);

    return parts.map((part, index) => {
      if (!part) return null;
      const spanKey = `${keyPrefix}-${index}`;

      // 1. Citation Badge: [CTX-1] or [1]
      const citMatch = part.match(/^\[(?:CTX-)?(\d+)\]$/);
      if (citMatch) {
        const citation = citations.find(
          (c) => c.label === part || c.label === `[CTX-${citMatch[1]}]` || c.label === `[${citMatch[1]}]`
        );
        if (citation) {
          const isSelected = activeSource?.id === citation.id;
          return (
            <button
              key={spanKey}
              type="button"
              onClick={() => onSelectSource?.(citation)}
              aria-label={`Inspect citation in ${citation.filePath}`}
              title={`Click to inspect ${citation.filePath}:${citation.startLine}-${citation.endLine} in Monaco Editor`}
              className={`inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-0.5 mx-1 rounded-full transition-all select-none align-baseline cursor-pointer shadow-sm ${
                isSelected
                  ? "bg-cyan-500 text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.6)] ring-2 ring-cyan-400"
                  : "bg-indigo-500/15 text-indigo-300 hover:text-white border border-indigo-500/30 hover:bg-indigo-500/30 hover:border-indigo-400 hover:shadow-[0_0_10px_rgba(99,102,241,0.4)]"
              }`}
            >
              <FileCode className="w-3 h-3" />
              <span>{citation.label}</span>
            </button>
          );
        }
      }

      // 2. Bold Text: **text**
      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
        return (
          <strong key={spanKey} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // 3. Inline Code: `code`
      if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
        return (
          <code
            key={spanKey}
            className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-white/[0.08] text-cyan-300 border border-white/[0.08]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      // 4. Plain Text
      return <span key={spanKey}>{part}</span>;
    });
  };

  /**
   * Helper to parse markdown text blocks into structured headings, lists, and paragraphs
   */
  const renderMarkdownBlock = (rawText: string, citations: Citation[], blockId: string) => {
    const lines = rawText.split("\n");
    const elements: React.ReactNode[] = [];
    let currentListItems: React.ReactNode[] = [];

    const flushList = () => {
      if (currentListItems.length > 0) {
        elements.push(
          <ul key={`ul-${blockId}-${elements.length}`} className="my-2 space-y-1.5 pl-1">
            {currentListItems}
          </ul>
        );
        currentListItems = [];
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        flushList();
        continue;
      }

      // Heading 3: ### Title
      if (trimmed.startsWith("### ")) {
        flushList();
        const headingText = trimmed.slice(4);
        elements.push(
          <h3
            key={`h3-${blockId}-${i}`}
            className="text-xs sm:text-sm font-bold text-white tracking-tight mt-3 mb-1.5 flex items-center gap-2 border-b border-white/[0.06] pb-1"
          >
            <span className="w-1.5 h-3.5 rounded-full bg-gradient-to-b from-indigo-500 to-cyan-400 shrink-0 inline-block" />
            <span className="flex-1">{renderInlineSpans(headingText, citations, `h3-${i}`)}</span>
          </h3>
        );
        continue;
      }

      // Heading 4: #### Subtitle
      if (trimmed.startsWith("#### ")) {
        flushList();
        const headingText = trimmed.slice(5);
        elements.push(
          <h4
            key={`h4-${blockId}-${i}`}
            className="text-xs font-bold text-indigo-300 tracking-wide mt-2.5 mb-1 uppercase flex items-center gap-1.5"
          >
            <span className="w-1 h-1 rounded-full bg-cyan-400 shrink-0 inline-block" />
            <span className="flex-1">{renderInlineSpans(headingText, citations, `h4-${i}`)}</span>
          </h4>
        );
        continue;
      }

      // Heading 2: ## Title
      if (trimmed.startsWith("## ")) {
        flushList();
        const headingText = trimmed.slice(3);
        elements.push(
          <h2
            key={`h2-${blockId}-${i}`}
            className="text-sm sm:text-base font-extrabold text-white tracking-tight mt-4 mb-2 flex items-center gap-2 border-b border-white/[0.08] pb-1.5"
          >
            <span className="w-2 h-4 rounded-full bg-indigo-500 shrink-0 inline-block" />
            <span className="flex-1">{renderInlineSpans(headingText, citations, `h2-${i}`)}</span>
          </h2>
        );
        continue;
      }

      // Bullet List Item: - or *
      const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (bulletMatch) {
        currentListItems.push(
          <li key={`li-${blockId}-${i}`} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0 shadow-[0_0_6px_rgba(6,182,212,0.6)]" />
            <span className="flex-1">{renderInlineSpans(bulletMatch[1], citations, `li-${i}`)}</span>
          </li>
        );
        continue;
      }

      // Numbered List Item: 1. or 2.
      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
      if (numMatch) {
        currentListItems.push(
          <li key={`num-li-${blockId}-${i}`} className="flex items-start gap-2 text-xs text-slate-300 leading-relaxed">
            <span className="text-[10px] font-mono font-bold text-indigo-400 px-1 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/20 shrink-0 mt-0.5">
              {numMatch[1]}
            </span>
            <span className="flex-1">{renderInlineSpans(numMatch[2], citations, `num-${i}`)}</span>
          </li>
        );
        continue;
      }

      // Standard Paragraph
      flushList();
      elements.push(
        <p key={`p-${blockId}-${i}`} className="text-xs text-slate-200 leading-relaxed mb-2">
          {renderInlineSpans(trimmed, citations, `p-${i}`)}
        </p>
      );
    }

    flushList();
    return elements;
  };

  /**
   * Helper to parse markdown blocks and interactive citation badges
   */
  const renderMessageContent = (content: string, citations: Citation[], msgId: string) => {
    // Split by code blocks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let blockCounter = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const precedingText = content.substring(lastIndex, match.index);
      if (precedingText) {
        elements.push(
          <div key={`md-${lastIndex}`}>
            {renderMarkdownBlock(precedingText, citations, `${msgId}-pre-${lastIndex}`)}
          </div>
        );
      }

      const lang = match[1] || "code";
      const code = match[2].trimEnd();
      const codeBlockId = `${msgId}-block-${blockCounter++}`;

      elements.push(
        <div
          key={codeBlockId}
          className="my-3 rounded-xl bg-[#060910] border border-white/[0.08] overflow-hidden shadow-lg"
        >
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-white/[0.03] border-b border-white/[0.06] text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1.5 uppercase font-semibold tracking-wider text-slate-300">
              <Terminal className="w-3 h-3 text-cyan-400" />
              {lang}
            </span>
            <button
              type="button"
              onClick={() => copyToClipboard(code, codeBlockId)}
              className="flex items-center gap-1 hover:text-white transition-colors px-1.5 py-0.5 rounded hover:bg-white/[0.05] cursor-pointer"
              title="Copy snippet"
            >
              {copiedId === codeBlockId ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed selection:bg-indigo-500/40">
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    const remainingText = content.substring(lastIndex);
    if (remainingText) {
      elements.push(
        <div key={`md-end-${lastIndex}`}>
          {renderMarkdownBlock(remainingText, citations, `${msgId}-post-${lastIndex}`)}
        </div>
      );
    }

    return elements;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#080C14] overflow-hidden relative font-sans">
      {/* Background ambient lighting */}
      <div className="aura-glow-top" />

      {/* Scrollable Message List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 relative z-10" role="log" aria-label="Conversation messages">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 select-none">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600/30 via-indigo-500/20 to-cyan-500/30 border border-indigo-500/30 flex items-center justify-center mb-4 shadow-xl shadow-indigo-500/10">
              <Sparkles className="w-7 h-7 text-indigo-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2">
              Engineering Intelligence Console
            </h3>
            <p className="text-xs text-slate-400 max-w-md leading-relaxed mb-6">
              Ask questions about architecture patterns, function boundaries, or specific components. All answers are grounded in AST chunks with line-level verified citations.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2 max-w-xl w-full">
              {SUGGESTED_QUERIES.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(q)}
                  className="w-full text-left sm:text-center px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition-all cursor-pointer group"
                >
                  <span className="text-indigo-400 font-bold mr-1 group-hover:translate-x-0.5 inline-block transition-transform">&rarr;</span>
                  &ldquo;{q}&rdquo;
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";

            if (isUser) {
              return (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[85%] sm:max-w-[70%] bg-gradient-to-r from-indigo-950/60 to-slate-900/80 border border-indigo-500/30 text-slate-100 rounded-2xl rounded-tr-sm px-4 py-3 text-xs shadow-lg shadow-black/40 backdrop-blur-md">
                    <p className="leading-relaxed whitespace-pre-wrap font-medium">{message.content}</p>
                    {message.createdAt && (
                      <span className="text-[10px] font-mono text-slate-400/80 mt-1.5 block text-right">
                        {message.createdAt}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            // Assistant Message
            return (
              <div
                key={message.id}
                className="w-full bg-[#0D1424]/75 border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl shadow-black/30 backdrop-blur-md"
              >
                {/* Header: Brand Mark + Status Badge + Timestamp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 p-[1px] shadow-md shadow-indigo-500/30 shrink-0">
                      <div className="w-full h-full bg-[#080C14] rounded-[7px] flex items-center justify-center">
                        {message.isStreaming ? (
                          <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">
                      RepoMind AI
                    </span>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {message.isStreaming ? "Streaming AST..." : "Grounded & Verified"}
                    </span>
                  </div>

                  {message.createdAt && (
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-600" />
                      {message.createdAt}
                    </span>
                  )}
                </div>

                {/* Parsed Message Content */}
                <div className="text-xs text-slate-200 leading-relaxed pl-1 sm:pl-2">
                  {message.content ? (
                    renderMessageContent(message.content, message.citations, message.id)
                  ) : (
                    <span className="text-slate-400 italic flex items-center gap-2 py-1">
                      <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                      Synthesizing context from repository AST chunks...
                    </span>
                  )}
                  {message.isStreaming && (
                    <span className="inline-block w-2 h-4 bg-cyan-400 ml-1.5 animate-pulse align-middle rounded-sm shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  )}
                </div>

                {/* Sources Bar Under Assistant Message */}
                {message.citations && message.citations.length > 0 && (
                  <div className="pt-3 border-t border-white/[0.06] space-y-2">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Verified Sources ({message.citations.length})</span>
                    </span>
                    <div className="flex flex-wrap gap-2 items-center">
                      {message.citations.map((c) => {
                        const isSelected = activeSource?.id === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => onSelectSource?.(c)}
                            aria-label={`Inspect source ${c.filePath} lines ${c.startLine} to ${c.endLine}`}
                            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all border cursor-pointer ${
                              isSelected
                                ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300 font-semibold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                                : "bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] hover:border-white/[0.18] text-slate-300"
                            }`}
                            title={`Click to inspect in CodeViewer (${c.filePath}:${c.startLine}-${c.endLine})`}
                          >
                            <FileCode className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="font-medium text-slate-200">{c.filePath}</span>
                            <span className="text-slate-500">:{c.startLine}–{c.endLine}</span>
                            {c.symbolName && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                                {c.symbolName}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Query Chips */}
      {messages.length <= 2 && (
        <div className="px-4 sm:px-6 pb-2 relative z-10 flex flex-wrap gap-2">
          {SUGGESTED_QUERIES.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isStreaming}
              onClick={() => handleSend(q)}
              className="text-[11px] font-medium px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] hover:border-indigo-500/40 transition-all flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>{q}</span>
            </button>
          ))}
        </div>
      )}

      {/* Floating Raycast/Cursor-Style Input Bar */}
      <div className="p-3 sm:p-5 relative z-20">
        {inputError && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span>{inputError}</span>
          </div>
        )}

        <form
          onSubmit={(e) => handleSend(undefined, e)}
          className="relative flex items-center bg-[#0D1424]/90 backdrop-blur-2xl border border-white/[0.12] focus-within:border-indigo-500/60 focus-within:shadow-[0_0_25px_-5px_rgba(99,102,241,0.3)] rounded-2xl transition-all shadow-2xl overflow-hidden p-1.5"
        >
          <div className="pl-3 pr-2 flex items-center gap-2 text-slate-400 shrink-0 select-none">
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/[0.05] text-indigo-300 border border-white/[0.08]">
              RAG
            </span>
          </div>

          <input
            type="text"
            value={inputText}
            disabled={isStreaming}
            onChange={(e) => {
              setInputText(e.target.value);
              if (inputError) setInputError(null);
            }}
            placeholder={
              isStreaming
                ? "Streaming response from repository AST..."
                : "Ask about this repository (e.g. 'Where is ErrorMessage defined?')..."
            }
            aria-label="Repository query input"
            className="flex-1 bg-transparent py-2.5 px-2 text-xs text-white placeholder-slate-500 focus:outline-none disabled:opacity-60 font-sans"
          />

          <button
            type="submit"
            disabled={isStreaming || !inputText.trim()}
            aria-label="Send query"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-xs transition-all shrink-0 cursor-pointer shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline">Send</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
