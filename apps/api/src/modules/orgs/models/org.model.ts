import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { Organization } from "@repomind/shared-types";

export interface IOrganizationDocument extends Document {
  name: string;
  slug: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  toClient(): Organization;
}

const OrganizationSchema = new Schema<IOrganizationDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
  },
);

OrganizationSchema.methods.toClient = function (): Organization {
  return {
    id: this._id.toString(),
    name: this.name,
    slug: this.slug,
    createdBy: this.createdBy.toString(),
    createdAt: this.createdAt.toISOString(),
    updatedAt: this.updatedAt.toISOString(),
  };
};

export const OrganizationModel: Model<IOrganizationDocument> =
  mongoose.models.Organization || mongoose.model<IOrganizationDocument>("Organization", OrganizationSchema);
