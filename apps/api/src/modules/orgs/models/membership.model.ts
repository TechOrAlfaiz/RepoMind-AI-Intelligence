import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { Membership, OrgRole } from "@repomind/shared-types";

export interface IMembershipDocument extends Document {
  userId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  role: OrgRole;
  createdAt: Date;
  updatedAt: Date;
  toClient(): Membership;
}

const MembershipSchema = new Schema<IMembershipDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
    role: {
      type: String,
      enum: ["owner", "admin", "member", "viewer"],
      default: "member",
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Enforce unique membership per user and organization
MembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

MembershipSchema.methods.toClient = function (): Membership {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    organizationId: this.organizationId.toString(),
    role: this.role,
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt?.toISOString(),
  };
};

export const MembershipModel: Model<IMembershipDocument> =
  mongoose.models.Membership || mongoose.model<IMembershipDocument>("Membership", MembershipSchema);
