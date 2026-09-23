import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { AuditLog, AuditAction, AuditStatus } from "@repomind/shared-types";

export interface IAuditDocument extends Document {
  actorId: string;
  actorEmail?: string;
  organizationId?: mongoose.Types.ObjectId;
  repositoryId?: mongoose.Types.ObjectId;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent?: string;
  status: AuditStatus;
  correlationId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  toClient(): AuditLog;
}

const AuditSchema = new Schema<IAuditDocument>(
  {
    actorId: { type: String, required: true, index: true },
    actorEmail: { type: String },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: "Repository", index: true },
    action: { type: String, required: true, index: true },
    resource: { type: String, required: true },
    ipAddress: { type: String, default: "127.0.0.1" },
    userAgent: { type: String },
    status: { type: String, enum: ["success", "failure", "denied"], default: "success", index: true },
    correlationId: { type: String, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,
  },
);

AuditSchema.index({ organizationId: 1, createdAt: -1 });
AuditSchema.index({ actorId: 1, createdAt: -1 });
AuditSchema.index({ action: 1, createdAt: -1 });

AuditSchema.methods.toClient = function (): AuditLog {
  return {
    id: this._id.toString(),
    actorId: this.actorId,
    actorEmail: this.actorEmail,
    organizationId: this.organizationId ? this.organizationId.toString() : undefined,
    repositoryId: this.repositoryId ? this.repositoryId.toString() : undefined,
    action: this.action as AuditAction,
    resource: this.resource,
    ipAddress: this.ipAddress,
    userAgent: this.userAgent,
    status: this.status,
    correlationId: this.correlationId,
    metadata: this.metadata,
    timestamp: this.createdAt.toISOString(),
  };
};

export const AuditModel: Model<IAuditDocument> =
  mongoose.models.AuditLog || mongoose.model<IAuditDocument>("AuditLog", AuditSchema);
