import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { Repository, IndexStatus } from "@repomind/shared-types";

export interface IRepositoryDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  githubRepoId: number;
  name: string;
  fullName: string;
  defaultBranch: string;
  branch: string;
  isPrivate: boolean;
  indexStatus: IndexStatus;
  lastIndexedAt: Date | null;
  currentCommitSha: string | null;
  indexVersion: number;
  createdAt: Date;
  updatedAt: Date;
  toClient(): Repository;
}

const RepositorySchema = new Schema<IRepositoryDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    githubRepoId: { type: Number, required: true, index: true },
    name: { type: String, required: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    defaultBranch: { type: String, default: "main", required: true },
    branch: { type: String, default: "main", required: true },
    isPrivate: { type: Boolean, default: false },
    indexStatus: {
      type: String,
      enum: ["pending", "indexing", "indexed", "failed"],
      default: "pending",
      required: true,
    },
    lastIndexedAt: { type: Date, default: null },
    currentCommitSha: { type: String, default: null },
    indexVersion: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  },
);

RepositorySchema.methods.toClient = function (): Repository {
  return {
    id: this._id.toString(),
    organizationId: this.organizationId.toString(),
    githubRepoId: this.githubRepoId,
    name: this.name,
    fullName: this.fullName,
    defaultBranch: this.defaultBranch,
    branch: this.branch,
    isPrivate: this.isPrivate,
    indexStatus: this.indexStatus,
    lastIndexedAt: this.lastIndexedAt?.toISOString() || null,
    currentCommitSha: this.currentCommitSha,
    indexVersion: this.indexVersion,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const RepositoryModel: Model<IRepositoryDocument> =
  mongoose.models.Repository || mongoose.model<IRepositoryDocument>("Repository", RepositorySchema);
