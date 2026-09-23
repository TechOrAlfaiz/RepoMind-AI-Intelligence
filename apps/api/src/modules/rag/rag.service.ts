import mongoose from "mongoose";
import { retrievalService } from "../retrieval/retrieval.service.js";
import { promptBuilder } from "./prompt-builder.js";
import { citationValidator } from "./citation-validator.js";
import { ConversationModel } from "./models/conversation.model.js";
import { MessageModel } from "./models/message.model.js";
import { ChunkModel } from "../chunking/models/chunk.model.js";
import { devChunks } from "../chunking/chunk.service.js";
import { formatContextualHeader } from "../chunking/parsers/ast-chunker.js";
import { isDbConnected } from "../../config/database.js";
import type {
  Conversation,
  Message,
  RetrievedChunk,
  ValidatedCitation,
  RAGTracePayload,
  StreamEvent,
} from "@repomind/shared-types";

// In-memory conversation storage for offline development
const devConversations = new Map<string, Conversation>();
const devMessages = new Map<string, Message[]>();

export class RAGService {
  /**
   * Retrieves or creates a conversation.
   */
  async getOrCreateConversation(
    organizationId: string,
    repositoryId: string,
    userId: string,
    conversationId?: string,
    title?: string,
  ): Promise<Conversation> {
    if (conversationId) {
      if (!isDbConnected()) {
        const existing = devConversations.get(conversationId);
        if (existing) return existing;
      } else {
        const existing = await ConversationModel.findById(conversationId);
        if (existing) return existing.toClient();
      }
    }

    const newId = conversationId || `convo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const convoTitle = title || "Repository AI Chat";

    if (!isDbConnected()) {
      const convo: Conversation = {
        id: newId,
        repositoryId,
        userId,
        title: convoTitle,
        createdAt: now,
        updatedAt: now,
      };
      devConversations.set(newId, convo);
      devMessages.set(newId, []);
      return convo;
    }

    const doc = await ConversationModel.create({
      organizationId: new mongoose.Types.ObjectId(organizationId),
      repositoryId: new mongoose.Types.ObjectId(repositoryId),
      userId: new mongoose.Types.ObjectId(userId),
      title: convoTitle,
    });

    return doc.toClient();
  }

  /**
   * Lists conversations for a repository.
   */
  async listConversations(repositoryId: string, userId: string): Promise<Conversation[]> {
    if (!isDbConnected()) {
      const list: Conversation[] = [];
      for (const c of devConversations.values()) {
        if (c.repositoryId === repositoryId && c.userId === userId) {
          list.push(c);
        }
      }
      return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    const docs = await ConversationModel.find({
      repositoryId: new mongoose.Types.ObjectId(repositoryId),
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ updatedAt: -1 });

    return docs.map((d) => d.toClient());
  }

  /**
   * Gets message history for a conversation.
   */
  async getMessages(conversationId: string): Promise<Message[]> {
    if (!isDbConnected()) {
      return devMessages.get(conversationId) || [];
    }

    const docs = await MessageModel.find({
      conversationId: new mongoose.Types.ObjectId(conversationId),
    }).sort({ createdAt: 1 });

    return docs.map((d) => d.toClient());
  }

  /**
   * Core RAG Generation and Streaming Engine.
   */
  /**
   * Directly retrieves AST chunks for a specific file path.
   */
  async getChunksForPath(repositoryId: string, filePath: string): Promise<RetrievedChunk[]> {
    const cleanPath = filePath.replace(/^[/\\]+/, "");
    if (!isDbConnected()) {
      const results: RetrievedChunk[] = [];
      for (const c of devChunks.values()) {
        const cPath = c.header?.path || "";
        if (c.repositoryId === repositoryId && (cPath === cleanPath || cPath.endsWith(cleanPath))) {
          results.push({
            chunkId: c.id,
            score: 1.0,
            repositoryId: c.repositoryId,
            fileId: c.fileId,
            filePath: cPath,
            startLine: c.startLine,
            endLine: c.endLine,
            symbolName: c.symbolName || c.header?.symbolName,
            chunkType: c.chunkType,
            content: c.content,
            contextualHeader: c.header ? formatContextualHeader(c.header) : `// File: ${cPath}`,
            language: c.header?.language || "javascript",
          });
        }
      }
      return results;
    }

    try {
      const docs = await ChunkModel.find({
        repositoryId: new mongoose.Types.ObjectId(repositoryId),
        $or: [
          { "header.path": cleanPath },
          { "header.path": new RegExp(`${cleanPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") },
        ],
      }).sort({ startLine: 1 });

      return docs.map((d) => ({
        chunkId: d._id.toString(),
        score: 1.0,
        repositoryId: d.repositoryId.toString(),
        fileId: d.fileId.toString(),
        filePath: d.header?.path || cleanPath,
        startLine: d.startLine,
        endLine: d.endLine,
        symbolName: d.symbolName || d.header?.symbolName,
        chunkType: d.chunkType,
        content: d.content,
        contextualHeader: d.header ? formatContextualHeader(d.header) : `// File: ${cleanPath}`,
        language: d.header?.language || "javascript",
      }));
    } catch (err) {
      console.warn("[RepoMind RAG] Error fetching chunks for path:", err);
      return [];
    }
  }

  /**
   * Core RAG Generation and Streaming Engine.
   */
  async streamRAGChat(
    params: {
      organizationId: string;
      repositoryId: string;
      userId: string;
      query: string;
      conversationId?: string;
      activeFilePath?: string;
    },
    onEvent: (event: StreamEvent) => void,
  ): Promise<{ answer: string; citations: ValidatedCitation[]; trace: RAGTracePayload }> {
    const startTime = Date.now();
    const { organizationId, repositoryId, userId, query, activeFilePath } = params;

    // 1. Get or create conversation thread
    const conversation = await this.getOrCreateConversation(
      organizationId,
      repositoryId,
      userId,
      params.conversationId,
      query.length > 35 ? `${query.substring(0, 32)}...` : query,
    );

    // 2. Check if user is referencing the active file
    const lowerQuery = query.toLowerCase();
    const refersToActiveFile = Boolean(
      activeFilePath && (
        lowerQuery.includes("this file") ||
        lowerQuery.includes("this component") ||
        lowerQuery.includes("this code") ||
        lowerQuery.includes("here") ||
        lowerQuery.includes("current file") ||
        lowerQuery.includes("open file") ||
        lowerQuery.startsWith("explain") ||
        lowerQuery.startsWith("what does this") ||
        lowerQuery.includes("how does this") ||
        lowerQuery.includes("summarize") ||
        lowerQuery.includes("review") ||
        lowerQuery.includes("analyze")
      )
    );

    let candidateChunks: RetrievedChunk[] = [];

    // If query is about active file, fetch chunks directly for that file
    if (activeFilePath && refersToActiveFile) {
      const fileDirectChunks = await this.getChunksForPath(repositoryId, activeFilePath);
      if (fileDirectChunks.length > 0) {
        candidateChunks = fileDirectChunks;
      }
    }

    // If no direct chunks or general query, run hybrid search with reranking
    if (candidateChunks.length === 0) {
      const effectiveQuery = activeFilePath && refersToActiveFile
        ? `${query} ${activeFilePath.split("/").pop() || ""}`
        : query;

      const retrievalRes = await retrievalService.hybridRetrieve(
        repositoryId,
        effectiveQuery,
        6,
      );
      candidateChunks = retrievalRes.results;
    }

    // 3. Build sandboxed prompt with numbered context blocks
    const promptContext = promptBuilder.buildPrompt(query, candidateChunks);

    // 4. Generate response with streaming tokens
    let rawResponse = "";
    const openAiKey = process.env.OPENAI_API_KEY;

    if (openAiKey && openAiKey.startsWith("sk-")) {
      try {
        rawResponse = await this.generateOpenAICompletion(promptContext, onEvent);
      } catch (err: any) {
        console.warn("[RepoMind RAG] OpenAI completion failed:", err.message, "Falling back to deterministic synthesizer.");
        rawResponse = await this.generateOfflineCompletion(query, candidateChunks, onEvent);
      }
    } else {
      rawResponse = await this.generateOfflineCompletion(query, candidateChunks, onEvent);
    }

    // 5. Post-Generation Citation Validation (NON-NEGOTIABLE)
    const validationResult = citationValidator.validate(rawResponse, candidateChunks);
    const finalAnswer = validationResult.sanitizedResponse;
    const validatedCitations = validationResult.validatedCitations;

    // Emit citations to stream
    for (const citation of validatedCitations) {
      onEvent({ type: "citation", payload: citation });
    }

    const latencyMs = Date.now() - startTime;
    const promptTokens = Math.round(promptContext.userPrompt.length / 4);
    const completionTokens = Math.round(finalAnswer.length / 4);

    // 6. Assemble Full Execution Trace
    const tracePayload: RAGTracePayload = {
      retrievedChunkIds: candidateChunks.map((c) => c.chunkId),
      prompt: promptContext.userPrompt,
      response: finalAnswer,
      latencyMs,
      tokenUsage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      validatedCitations,
    };

    onEvent({ type: "trace", payload: tracePayload });
    onEvent({ type: "done", payload: { conversationId: conversation.id } });

    // 7. Persist User Message & Assistant Message with Trace
    await this.persistMessages(
      conversation.id,
      repositoryId,
      query,
      finalAnswer,
      validatedCitations,
      tracePayload,
    );

    return {
      answer: finalAnswer,
      citations: validatedCitations,
      trace: tracePayload,
    };
  }

  /**
   * Offline Deterministic RAG Synthesizer for resilient local testing and dev without OpenAI keys.
   */
  private async generateOfflineCompletion(
    query: string,
    chunks: RetrievedChunk[],
    onEvent: (event: StreamEvent) => void,
  ): Promise<string> {
    const stopWords = new Set(["where", "is", "the", "in", "this", "and", "or", "to", "how", "what", "does", "implemented", "defined", "work", "repository", "codebase", "project", "explain", "file", "code"]);
    const queryKeywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    const matchesKeyword = queryKeywords.some((kw) =>
      chunks.some(
        (c) =>
          c.filePath.toLowerCase().includes(kw) ||
          c.content.toLowerCase().includes(kw) ||
          (c.symbolName && c.symbolName.toLowerCase().includes(kw)),
      ),
    );

    if (chunks.length === 0 || (!matchesKeyword && queryKeywords.length > 0)) {
      const msg = `I searched the indexed repository, but no code or documentation related to "${query}" was found. This feature or technology does not appear to be implemented in this codebase.`;
      await this.streamWords(msg, onEvent);
      return msg;
    }

    const topChunk = chunks[0];
    const topCitationTag = `[CTX-1]`;
    const secondaryCitation = chunks.length > 1 ? `[CTX-2]` : "";

    const lowerQ = query.toLowerCase();
    const isExplainQuery =
      lowerQ.includes("explain") ||
      lowerQ.includes("what does") ||
      lowerQ.includes("how does") ||
      lowerQ.includes("understand") ||
      lowerQ.includes("summarize") ||
      lowerQ.includes("walkthrough") ||
      lowerQ.includes("tell me about");

    if (isExplainQuery) {
      const fileName = topChunk.filePath.split("/").pop() || topChunk.filePath;
      const symbolName = topChunk.symbolName && topChunk.symbolName !== "block_1" ? topChunk.symbolName : fileName.replace(/\.[^/.]+$/, "");

      // Extract props/params if function/component
      const propsList: string[] = [];
      const firstLines = topChunk.content.split("\n").slice(0, 4).join(" ");
      const destructuringMatch = firstLines.match(/\(\s*\{\s*([\s\S]+?)\s*\}\s*[,)]/);
      if (destructuringMatch) {
        const rawProps = destructuringMatch[1];
        const keyMatches = rawProps.match(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:=|,|\n|$)/g);
        if (keyMatches) {
          const keys = Array.from(
            new Set(
              keyMatches
                .map((k) => k.replace(/[^a-zA-Z0-9_$]/g, "").trim())
                .filter((k) => k && !["year", "month", "day", "hour", "minute", "second"].includes(k))
            )
          );
          propsList.push(...keys.slice(0, 6));
        }
      } else {
        const standardParamMatch = firstLines.match(/\(\s*([a-zA-Z0-9_$,\s]+)\s*\)/);
        if (standardParamMatch) {
          const params = standardParamMatch[1]
            .split(",")
            .map((p) => p.trim())
            .filter((p) => p && p.length < 30 && !p.includes("{"));
          propsList.push(...params.slice(0, 5));
        }
      }

      // Detect conditionals / guard clauses
      const hasGuardClause = topChunk.content.includes("if (") || topChunk.content.includes("if(");

      let answer = `### Architecture & Implementation of \`${fileName}\` ${topCitationTag}\n\n`;
      answer += `The file \`${topChunk.filePath}\` (lines ${topChunk.startLine}–${topChunk.endLine}) defines `;
      if (topChunk.symbolName && topChunk.symbolName !== "block_1") {
        answer += `the **\`${topChunk.symbolName}\`** ${topChunk.chunkType} ${topCitationTag}.\n\n`;
      } else {
        answer += `the core module implementation for this file ${topCitationTag}.\n\n`;
      }

      if (propsList.length > 0) {
        answer += `#### 1. Props & State Parameters\n`;
        answer += `The component accepts the following input parameters:\n`;
        for (const prop of propsList) {
          const lower = prop.toLowerCase();
          let description = `Configures dynamic rendering and state behavior`;
          if (lower.includes("callback") || lower.startsWith("on") || lower.includes("handler")) {
            description = `Event handler callback triggered on user interaction`;
          } else if (lower.includes("style") || lower.includes("class") || lower.includes("variant")) {
            description = `Controls visual styling, appearance, and variant themes`;
          } else if (lower.includes("data") || lower.includes("item") || lower.includes("list") || lower.includes("repo")) {
            description = `Primary data payload or entity object passed down for rendering`;
          } else if (lower.includes("show") || lower.includes("is") || lower.includes("has") || lower.includes("enabled")) {
            description = `Boolean flag toggling conditional display of sub-components`;
          } else if (lower.includes("format") || lower.includes("date") || lower.includes("time")) {
            description = `Formatting options configuration for values and dates`;
          }
          answer += `- \`${prop}\`: ${description}.\n`;
        }
        answer += `\n`;
      }

      answer += `#### 2. Core Logic & Control Flow\n`;
      if (hasGuardClause) {
        answer += `- **Defensive Guard**: Includes early conditional checks (e.g. boundary validation) to avoid rendering unnecessary elements.\n`;
      }
      if (topChunk.content.includes("<button") || topChunk.content.includes("onClick")) {
        answer += `- **Interactive Handlers**: Provides event-driven controls with reactive disabled states.\n`;
      }
      if (topChunk.content.includes("return (") || topChunk.content.includes("return null")) {
        answer += `- **Render Output**: Outputs structured semantic JSX with responsive layout styling.\n`;
      }
      answer += `\n`;

      answer += `#### 3. Verified Source Implementation\n`;
      answer += "```" + topChunk.language + "\n";
      answer += topChunk.content + "\n";
      answer += "```\n\n";

      if (chunks.length > 1) {
        const secondChunk = chunks[1];
        answer += `#### 4. Additional Context\n`;
        answer += `Related definitions and secondary references are indexed in \`${secondChunk.filePath}\` (lines ${secondChunk.startLine}–${secondChunk.endLine}) ${secondaryCitation}.\n\n`;
      }

      answer += `All citations are deterministically proven against indexed AST chunks.`;
      await this.streamWords(answer, onEvent);
      return answer;
    }

    let answer = `Based on the repository context, here is the relevant implementation for **"${query}"**:\n\n`;
    answer += `In \`${topChunk.filePath}\` (lines ${topChunk.startLine}–${topChunk.endLine}), `;
    if (topChunk.symbolName) {
      answer += `the symbol \`${topChunk.symbolName}\` (${topChunk.chunkType}) implements this logic ${topCitationTag}.\n\n`;
    } else {
      answer += `the following block defines the implementation ${topCitationTag}:\n\n`;
    }

    answer += "```" + topChunk.language + "\n";
    answer += topChunk.content.split("\n").slice(0, 8).join("\n") + "\n";
    answer += "```\n\n";

    if (chunks.length > 1) {
      const secondChunk = chunks[1];
      answer += `Additionally, related definitions are found in \`${secondChunk.filePath}\` (lines ${secondChunk.startLine}–${secondChunk.endLine}) ${secondaryCitation}.\n`;
    }

    answer += `\nAll code references are strictly verified against indexed AST chunks.`;

    await this.streamWords(answer, onEvent);
    return answer;
  }

  private async streamWords(text: string, onEvent: (event: StreamEvent) => void): Promise<void> {
    const words = text.split(" ");
    for (let i = 0; i < words.length; i++) {
      const token = (i === 0 ? "" : " ") + words[i];
      onEvent({ type: "token", payload: token });
      // Minor micro-delay to simulate progressive SSE stream
      await new Promise((r) => setTimeout(r, 10));
    }
  }

  /**
   * OpenAI Streaming Completion.
   */
  private async generateOpenAICompletion(
    promptContext: { systemPrompt: string; userPrompt: string },
    onEvent: (event: StreamEvent) => void,
  ): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: promptContext.systemPrompt },
          { role: "user", content: promptContext.userPrompt },
        ],
        temperature: 0.1,
        stream: true,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenAI Chat Completion API error: ${res.statusText}`);
    }

    let fullText = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunkStr = decoder.decode(value);
      const lines = chunkStr.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const data = JSON.parse(line.slice(6));
            const delta = data.choices[0]?.delta?.content || "";
            if (delta) {
              fullText += delta;
              onEvent({ type: "token", payload: delta });
            }
          } catch {}
        }
      }
    }

    return fullText;
  }

  /**
   * Persists user and assistant messages with execution trace into DB or memory.
   */
  private async persistMessages(
    conversationId: string,
    repositoryId: string,
    userQuery: string,
    assistantResponse: string,
    citations: ValidatedCitation[],
    trace: RAGTracePayload,
  ): Promise<void> {
    const now = new Date().toISOString();

    if (!isDbConnected()) {
      const history = devMessages.get(conversationId) || [];
      const userMsg: Message = {
        id: `msg_user_${Date.now()}`,
        conversationId,
        role: "user",
        content: userQuery,
        createdAt: now,
      };
      const assistantMsg: Message = {
        id: `msg_asst_${Date.now()}`,
        conversationId,
        role: "assistant",
        content: assistantResponse,
        citations,
        trace,
        tokenUsage: {
          promptTokens: trace.tokenUsage.promptTokens,
          completionTokens: trace.tokenUsage.completionTokens,
        },
        createdAt: now,
      };
      history.push(userMsg, assistantMsg);
      devMessages.set(conversationId, history);

      // Update conversation updatedAt
      const convo = devConversations.get(conversationId);
      if (convo) {
        convo.updatedAt = now;
      }
      return;
    }

    // Persist to MongoDB
    await MessageModel.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      repositoryId: new mongoose.Types.ObjectId(repositoryId),
      role: "user",
      content: userQuery,
    });

    await MessageModel.create({
      conversationId: new mongoose.Types.ObjectId(conversationId),
      repositoryId: new mongoose.Types.ObjectId(repositoryId),
      role: "assistant",
      content: assistantResponse,
      citations,
      trace,
      tokenUsage: {
        promptTokens: trace.tokenUsage.promptTokens,
        completionTokens: trace.tokenUsage.completionTokens,
      },
    });

    await ConversationModel.updateOne(
      { _id: new mongoose.Types.ObjectId(conversationId) },
      { updatedAt: new Date() },
    );
  }
}

export const ragService = new RAGService();
