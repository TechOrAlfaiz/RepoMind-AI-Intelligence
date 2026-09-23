import mongoose, { Schema, Document } from "mongoose";
import type { Message, ValidatedCitation, RAGTracePayload } from "@repomind/shared-types";

export interface IMessageDocument extends Document {
  conversationId: mongoose.Types.ObjectId;
  repositoryId: mongoose.Types.ObjectId;
  role: "user" | "assistant" | "system";
  content: string;
  citations: ValidatedCitation[];
  trace?: RAGTracePayload;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
  };
  createdAt: Date;
  updatedAt: Date;
  toClient(): Message;
}

const CitationSchema = new Schema(
  {
    chunkId: { type: String, required: true },
    filePath: { type: String, required: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    symbolName: { type: String },
    snippet: { type: String, required: true },
    contextIndex: { type: Number, required: true },
    commitSha: { type: String },
  },
  { _id: false },
);

const MessageSchema = new Schema<IMessageDocument>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: "Repository", required: true, index: true },
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    citations: [CitationSchema],
    trace: { type: Schema.Types.Mixed },
    tokenUsage: {
      promptTokens: { type: Number },
      completionTokens: { type: Number },
    },
  },
  {
    timestamps: true,
  },
);

MessageSchema.methods.toClient = function (): Message {
  return {
    id: this._id.toString(),
    conversationId: this.conversationId.toString(),
    role: this.role,
    content: this.content,
    citations: this.citations || [],
    trace: this.trace,
    tokenUsage: this.tokenUsage,
    createdAt: this.createdAt.toISOString(),
  };
};

export const MessageModel = mongoose.model<IMessageDocument>("Message", MessageSchema);
