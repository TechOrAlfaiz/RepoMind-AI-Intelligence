import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { GitHubIssue, IssueComment } from "@repomind/shared-types";

export interface IssueDocument extends Document {
  repositoryId: mongoose.Types.ObjectId;
  githubIssueId: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  labels: string[];
  author: string;
  comments: IssueComment[];
  linkedPrs: number[];
  createdAt: Date;
  updatedAt: Date;
  toClient(): GitHubIssue;
}

const CommentSchema = new Schema<IssueComment>(
  {
    id: { type: String, required: true },
    author: { type: String, required: true },
    body: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { _id: false },
);

const IssueSchema = new Schema<IssueDocument>(
  {
    repositoryId: {
      type: Schema.Types.ObjectId,
      ref: "Repository",
      required: true,
      index: true,
    },
    githubIssueId: { type: Number, required: true },
    number: { type: Number, required: true },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    state: { type: String, enum: ["open", "closed"], default: "open", index: true },
    labels: { type: [String], default: [] },
    author: { type: String, default: "ghost" },
    comments: { type: [CommentSchema], default: [] },
    linkedPrs: { type: [Number], default: [] },
  },
  {
    timestamps: true,
  },
);

IssueSchema.index({ repositoryId: 1, number: 1 }, { unique: true });
IssueSchema.index({ repositoryId: 1, state: 1 });

IssueSchema.methods.toClient = function (): GitHubIssue {
  return {
    id: this._id.toString(),
    repositoryId: this.repositoryId.toString(),
    githubIssueId: this.githubIssueId,
    number: this.number,
    title: this.title,
    body: this.body,
    state: this.state,
    labels: this.labels,
    author: this.author,
    comments: this.comments,
    linkedPrs: this.linkedPrs,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const IssueModel: Model<IssueDocument> =
  mongoose.models.Issue || mongoose.model<IssueDocument>("Issue", IssueSchema);
