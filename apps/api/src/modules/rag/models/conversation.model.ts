import mongoose, { Schema, Document } from "mongoose";
import type { Conversation } from "@repomind/shared-types";

export interface IConversationDocument extends Document {
  organizationId: mongoose.Types.ObjectId;
  repositoryId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  toClient(): Conversation;
}

const ConversationSchema = new Schema<IConversationDocument>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: "Repository", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, default: "New Conversation" },
  },
  {
    timestamps: true,
  },
);

ConversationSchema.methods.toClient = function (): Conversation {
  return {
    id: this._id.toString(),
    repositoryId: this.repositoryId.toString(),
    userId: this.userId.toString(),
    title: this.title,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const ConversationModel = mongoose.model<IConversationDocument>(
  "Conversation",
  ConversationSchema,
);
