import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { ChunkRecord, ChunkType, ContextualHeader } from "@repomind/shared-types";

export interface IChunkDocument extends Document {
  repositoryId: mongoose.Types.ObjectId;
  fileId: mongoose.Types.ObjectId;
  symbolName?: string;
  startLine: number;
  endLine: number;
  content: string;
  contentHash: string;
  chunkType: ChunkType;
  embeddingVersion: number;
  header: ContextualHeader;
  isEmbedded: boolean;
  createdAt: Date;
  updatedAt: Date;
  toClient(): ChunkRecord;
}

const ContextualHeaderSchema = new Schema<ContextualHeader>(
  {
    repository: { type: String, required: true },
    path: { type: String, required: true },
    symbolName: { type: String },
    language: { type: String, required: true },
    scope: { type: String },
  },
  { _id: false },
);

const ChunkSchema = new Schema<IChunkDocument>(
  {
    repositoryId: { type: Schema.Types.ObjectId, ref: "Repository", required: true, index: true },
    fileId: { type: Schema.Types.ObjectId, ref: "File", required: true, index: true },
    symbolName: { type: String, trim: true },
    startLine: { type: Number, required: true },
    endLine: { type: Number, required: true },
    content: { type: String, required: true },
    contentHash: { type: String, required: true, index: true },
    chunkType: {
      type: String,
      enum: ["function", "class", "interface", "method", "type", "block"],
      required: true,
    },
    embeddingVersion: { type: Number, default: 1 },
    header: { type: ContextualHeaderSchema, required: true },
    isEmbedded: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

// Compound index for fast tenant & file chunk lookups
ChunkSchema.index({ repositoryId: 1, fileId: 1 });
ChunkSchema.index({ repositoryId: 1, contentHash: 1 });

ChunkSchema.methods.toClient = function (): ChunkRecord {
  return {
    id: this._id.toString(),
    repositoryId: this.repositoryId.toString(),
    fileId: this.fileId.toString(),
    symbolName: this.symbolName,
    startLine: this.startLine,
    endLine: this.endLine,
    content: this.content,
    contentHash: this.contentHash,
    chunkType: this.chunkType,
    embeddingVersion: this.embeddingVersion,
    header: this.header,
    createdAt: this.createdAt.toISOString(),
  };
};

export const ChunkModel: Model<IChunkDocument> =
  mongoose.models.Chunk || mongoose.model<IChunkDocument>("Chunk", ChunkSchema);
