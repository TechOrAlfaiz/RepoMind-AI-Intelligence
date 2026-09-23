import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Sparkles,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronUp,
  FileCode,
  ShieldCheck,
  Bot,
  User,
  Plus,
  ExternalLink,
  History,
} from "lucide-react";
import type { Message, Conversation, ValidatedCitation, RAGTracePayload } from "@repomind/shared-types";
import { useOrg } from "../../context/OrgContext";

interface ChatDrawerProps {
  repoId: string;
  repoName: string;
  onClose: () => void;
  onOpenCitation?: (citation: ValidatedCitation) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  repoId,
  repoName,
  onClose,
  onOpenCitation,
}) => {
  const { activeOrg } = useOrg();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingCitations, setStreamingCitations] = useState<ValidatedCitation[]>([]);
  const [streamingTrace, setStreamingTrace] = useState<RAGTracePayload | null>(null);
  const [expandedCitation, setExpandedCitation] = useState<number | null>(null);
  const [showTraceForMsg, setShowTraceForMsg] = useState<string | null>(null);
  const [timeMachineSha, setTimeMachineSha] = useState<string>("");
  const [showTimeMachine, setShowTimeMachine] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Load conversations on mount
  useEffect(() => {
    fetchConversations();
  }, [repoId]);

  const fetchConversations = async () => {
    if (!activeOrg) return;
    try {
      const res = await fetch(`/api/repos/${repoId}/conversations`, {
        headers: { "x-organization-id": activeOrg.id },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        if (data.conversations?.length > 0 && !activeConversationId) {
          loadMessages(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const loadMessages = async (convoId: string) => {
    if (!activeOrg) return;
    setActiveConversationId(convoId);
    try {
      const res = await fetch(`/api/repos/${repoId}/conversations/${convoId}/messages`, {
        headers: { "x-organization-id": activeOrg.id },
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  const handleStartNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamingText("");
    setStreamingCitations([]);
    setStreamingTrace(null);
  };

  const handleSendMessage = async (customQuery?: string) => {
    const q = (customQuery || inputQuery).trim();
    if (!q || isStreaming || !activeOrg) return;

    setInputQuery("");
    setIsStreaming(true);
    setStreamingText("");
    setStreamingCitations([]);
    setStreamingTrace(null);

    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp_user_${Date.now()}`,
      conversationId: activeConversationId || "pending",
      role: "user",
      content: q,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      if (timeMachineSha.trim()) {
        // Historical Commit / Tag Pinned Query via Phase 15 Time Machine
        const tmRes = await fetch(`/api/repos/${repoId}/time-machine/ask`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-organization-id": activeOrg.id,
          },
          credentials: "include",
          body: JSON.stringify({
            query: q,
            atCommitSha: timeMachineSha.trim(),
          }),
        });

        if (!tmRes.ok) {
          const errData = await tmRes.json().catch(() => ({}));
          throw new Error(errData.error || `Time Machine request failed (${tmRes.statusText})`);
        }

        const data = await tmRes.json();
        const assistantMsg: Message = {
          id: `asst_tm_${Date.now()}`,
          conversationId: activeConversationId || "time-machine",
          role: "assistant",
          content: `🕒 **Time Machine Pinned [${data.snapshot?.commitSha?.substring(0, 7) || timeMachineSha.trim()}]** (${data.snapshot?.filesCount ?? "?"} indexed files):\n\n${data.answer}`,
          citations: data.citations || [],
          trace: data.trace,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setIsStreaming(false);
        return;
      }

      const response = await fetch(`/api/repos/${repoId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          "x-organization-id": activeOrg.id,
        },
        credentials: "include",
        body: JSON.stringify({
          query: q,
          conversationId: activeConversationId || undefined,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Chat stream error: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedText = "";
      const currentCitations: ValidatedCitation[] = [];
      let latestTrace: RAGTracePayload | null = null;
      let confirmedConvoId = activeConversationId;

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
                setStreamingText(accumulatedText);
              } else if (event.type === "citation") {
                currentCitations.push(event.payload);
                setStreamingCitations([...currentCitations]);
              } else if (event.type === "trace") {
                latestTrace = event.payload;
                setStreamingTrace(event.payload);
              } else if (event.type === "done") {
                confirmedConvoId = event.payload.conversationId;
                setActiveConversationId(confirmedConvoId);
              }
            } catch (e) {
              console.warn("Failed parsing SSE event:", e);
            }
          }
        }
      }

      // Finalize assistant message
      const assistantMsg: Message = {
        id: `asst_${Date.now()}`,
        conversationId: confirmedConvoId || "saved",
        role: "assistant",
        content: accumulatedText,
        citations: currentCitations,
        trace: latestTrace || undefined,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingText("");
      setStreamingCitations([]);
      setStreamingTrace(null);
      fetchConversations();
    } catch (err: any) {
      console.error("Stream failed:", err);
      const errorMsg: Message = {
        id: `err_${Date.now()}`,
        conversationId: activeConversationId || "error",
        role: "assistant",
        content: `Error generating response: ${err.message || "Request failed"}. Please try again.`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col backdrop-blur-md">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/70 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 p-0.5 shadow-md shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">RepoMind AI Pair Programmer</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Cited RAG
              </span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-md">
              Context: <span className="text-indigo-400 font-mono font-semibold">{repoName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartNewChat}
            title="Start new conversation"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Conversations Pill Bar */}
      {conversations.length > 0 && (
        <div className="px-4 py-2 border-b border-slate-800/60 bg-slate-950/40 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-500 text-[11px] font-medium whitespace-nowrap">History:</span>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => loadMessages(c.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap border ${
                activeConversationId === c.id
                  ? "bg-indigo-600/30 text-indigo-300 border-indigo-500/40"
                  : "bg-slate-800/60 hover:bg-slate-800 text-slate-400 border-slate-800"
              }`}
            >
              {c.title}
            </button>
          ))}
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isStreaming ? (
          <div className="py-16 text-center text-slate-500 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-300">Ask anything about {repoName}</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Every answer extracts line-level AST chunks with post-generation citation validation.
              </p>
            </div>

            {/* Starter Prompts */}
            <div className="grid grid-cols-1 gap-2 max-w-md mx-auto text-left pt-2">
              {[
                "Where is AES-256 token encryption implemented?",
                "How are organization roles authorized on endpoints?",
                "Explain the background ingestion worker queue.",
                "How does AST-based code chunking decompose functions?",
              ].map((starter) => (
                <button
                  key={starter}
                  onClick={() => handleSendMessage(starter)}
                  className="p-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 text-xs text-slate-300 transition text-left flex items-center justify-between group"
                >
                  <span>{starter}</span>
                  <Send className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 transition" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role !== "user" && (
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 rounded-br-none"
                    : "bg-slate-950/80 border border-slate-800/90 text-slate-200 rounded-bl-none shadow-sm"
                }`}
              >
                {/* Message Body */}
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {/* Validated Citations Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Validated Code Citations ({msg.citations.length}):</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((c, idx) => (
                        <div key={idx} className="relative">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                if (onOpenCitation) {
                                  onOpenCitation(c);
                                } else {
                                  setExpandedCitation(expandedCitation === idx ? null : idx);
                                }
                              }}
                              title="Open in Monaco Code Viewer"
                              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700/80 hover:border-indigo-500/60 text-[11px] font-mono text-indigo-300 transition flex items-center gap-1 group/btn cursor-pointer shadow-sm"
                            >
                              <FileCode className="w-3 h-3 text-slate-400 group-hover/btn:text-indigo-400" />
                              <span>
                                {c.filePath}:{c.startLine}-{c.endLine}
                              </span>
                              {c.symbolName && (
                                <span className="text-[10px] text-purple-400 font-semibold">
                                  ({c.symbolName})
                                </span>
                              )}
                              {onOpenCitation && (
                                <ExternalLink className="w-2.5 h-2.5 text-slate-500 group-hover/btn:text-indigo-300 ml-0.5 opacity-70" />
                              )}
                            </button>
                            <button
                              onClick={() =>
                                setExpandedCitation(expandedCitation === idx ? null : idx)
                              }
                              title={expandedCitation === idx ? "Hide snippet" : "Quick preview snippet"}
                              className="px-1.5 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-400 hover:text-slate-200 transition"
                            >
                              {expandedCitation === idx ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {/* Expanded Snippet Popover */}
                          {expandedCitation === idx && (
                            <div className="mt-1 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-300 shadow-xl overflow-x-auto max-h-40">
                              <div className="text-slate-500 mb-1 flex items-center justify-between">
                                <span>{c.filePath}</span>
                                <div className="flex items-center gap-2">
                                  <span>lines {c.startLine}–{c.endLine}</span>
                                  {onOpenCitation && (
                                    <button
                                      onClick={() => onOpenCitation(c)}
                                      className="text-indigo-400 hover:text-indigo-300 underline text-[10px] flex items-center gap-1"
                                    >
                                      View full file <ExternalLink className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <pre className="text-slate-200">{c.snippet}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Telemetry Trace Accordion */}
                {msg.trace && (
                  <div className="mt-2 text-[10px]">
                    <button
                      onClick={() =>
                        setShowTraceForMsg(showTraceForMsg === msg.id ? null : msg.id)
                      }
                      className="text-slate-500 hover:text-slate-400 flex items-center gap-1 transition"
                    >
                      <Clock className="w-3 h-3" />
                      <span>{msg.trace.latencyMs}ms</span>
                      <span>&bull;</span>
                      <span>{msg.trace.tokenUsage.totalTokens} tokens</span>
                      {showTraceForMsg === msg.id ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {showTraceForMsg === msg.id && (
                      <div className="mt-1.5 p-2 rounded bg-slate-900/90 border border-slate-800 text-slate-400 font-mono space-y-1">
                        <div>Chunks Retrieved: {msg.trace.retrievedChunkIds.length}</div>
                        <div>Prompt Tokens: {msg.trace.tokenUsage.promptTokens}</div>
                        <div>Completion Tokens: {msg.trace.tokenUsage.completionTokens}</div>
                        <div>Latency: {msg.trace.latencyMs}ms</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Live Streaming Message */}
        {isStreaming && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4" />
            </div>

            <div className="max-w-[85%] rounded-2xl rounded-bl-none p-4 text-xs leading-relaxed bg-slate-950/80 border border-slate-800/90 text-slate-200 shadow-sm">
              <div className="whitespace-pre-wrap font-sans">
                {streamingText || (
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Scanning repository vectors &amp; reasoning...
                  </span>
                )}
                <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-1 animate-pulse" />
              </div>

              {streamingCitations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                  {streamingCitations.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => onOpenCitation?.(c)}
                      title="Open in Code Viewer"
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-[10px] font-mono text-emerald-400 transition flex items-center gap-1 cursor-pointer"
                    >
                      <span>
                        {c.filePath}:{c.startLine}-{c.endLine}
                      </span>
                      {onOpenCitation && <ExternalLink className="w-2.5 h-2.5 opacity-60" />}
                    </button>
                  ))}
                </div>
              )}

              {streamingTrace && (
                <div className="mt-2 text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>{streamingTrace.latencyMs}ms</span>
                  <span>&bull;</span>
                  <span>{streamingTrace.tokenUsage.totalTokens} tokens</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/70 space-y-2">
        {/* Time Machine Sub-bar */}
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setShowTimeMachine(!showTimeMachine)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border transition font-mono text-[11px] ${
              timeMachineSha.trim()
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800"
            }`}
          >
            <History className="w-3 h-3" />
            <span>Time Machine:</span>
            <span className="font-semibold">
              {timeMachineSha.trim() ? timeMachineSha.trim().substring(0, 7) : "HEAD (Current)"}
            </span>
          </button>

          {timeMachineSha.trim() && (
            <button
              type="button"
              onClick={() => setTimeMachineSha("")}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              Reset to HEAD
            </button>
          )}
        </div>

        {showTimeMachine && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] text-slate-400 font-medium">Historical SHA / Tag:</span>
            <input
              type="text"
              placeholder="e.g. 7f3b8a1 or v1.0.0"
              value={timeMachineSha}
              onChange={(e) => setTimeMachineSha(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 focus-within:border-indigo-500 transition"
        >
          <input
            type="text"
            placeholder={
              timeMachineSha.trim()
                ? `Ask question as of historical commit ${timeMachineSha.trim().substring(0, 7)}...`
                : "Ask about this repository (e.g. 'How does authentication work?')..."
            }
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={isStreaming}
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isStreaming || !inputQuery.trim()}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition shadow-sm"
          >
            {isStreaming ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
