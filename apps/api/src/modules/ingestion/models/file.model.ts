import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { FileRecord } from "@repomind/shared-types";

export interface IFileDocument extends Document {
  repositoryId: mongoose.Types.ObjectId;
  path: string;
  language: string;
  contentHash: string;
  latestSha: string;
  size: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  toClient(): FileRecord;
}

const FileSchema = new Schema<IFileDocument>(
  {
    repositoryId: { type: Schema.Types.ObjectId, ref: "Repository", required: true, index: true },
    path: { type: String, required: true },
    language: { type: String, required: true },
    contentHash: { type: String, required: true, index: true },
    latestSha: { type: String, required: true },
    size: { type: Number, required: true },
    content: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

// Enforce unique file path per repository
FileSchema.index({ repositoryId: 1, path: 1 }, { unique: true });

FileSchema.methods.toClient = function (): FileRecord {
  return {
    id: this._id.toString(),
    repositoryId: this.repositoryId.toString(),
    path: this.path,
    language: this.language,
    contentHash: this.contentHash,
    latestSha: this.latestSha,
    size: this.size,
    content: this.content,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const FileModel: Model<IFileDocument> =
  mongoose.models.File || mongoose.model<IFileDocument>("File", FileSchema);
