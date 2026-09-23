import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { EncryptedToken, SessionUser } from "@repomind/shared-types";

export interface IUserDocument extends Document {
  githubId: string;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  encryptedAccessToken: EncryptedToken;
  createdAt: Date;
  updatedAt: Date;
  toSessionUser(): SessionUser;
}

const EncryptedTokenSchema = new Schema<EncryptedToken>(
  {
    encryptedData: { type: String, required: true },
    iv: { type: String, required: true },
    authTag: { type: String, required: true },
  },
  { _id: false },
);

const UserSchema = new Schema<IUserDocument>(
  {
    githubId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, index: true },
    displayName: { type: String, default: null },
    email: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    encryptedAccessToken: { type: EncryptedTokenSchema, required: true },
  },
  {
    timestamps: true,
  },
);

UserSchema.methods.toSessionUser = function (): SessionUser {
  return {
    id: this._id.toString(),
    githubId: this.githubId,
    username: this.username,
    displayName: this.displayName,
    email: this.email,
    avatarUrl: this.avatarUrl,
  };
};

export const UserModel: Model<IUserDocument> =
  mongoose.models.User || mongoose.model<IUserDocument>("User", UserSchema);
