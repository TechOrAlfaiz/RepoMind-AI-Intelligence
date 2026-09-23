export interface Citation {
  chunkId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  symbolName?: string;
  snippet: string;
  contextIndex: number;
  commitSha?: string;
}

export type ValidatedCitation = Citation;

export interface RAGTracePayload {
  retrievedChunkIds: string[];
  prompt: string;
  response: string;
  latencyMs: number;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  validatedCitations: ValidatedCitation[];
}

export interface RAGQueryRequest {
  repositoryId: string;
  query: string;
  conversationId?: string;
}

export interface RAGQueryResponse {
  answer: string;
  citations: ValidatedCitation[];
  conversationId: string;
  messageId: string;
  latencyMs: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  trace?: RAGTracePayload;
}

export type StreamEventType = "token" | "citation" | "trace" | "done" | "error";

export interface StreamEvent {
  type: StreamEventType;
  payload: any;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: ValidatedCitation[];
  trace?: RAGTracePayload;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
  };
  createdAt: string;
}

export interface Conversation {
  id: string;
  repositoryId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

