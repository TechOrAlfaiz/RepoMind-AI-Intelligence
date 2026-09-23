import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load .env from workspace root or current working dir
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });
dotenv.config();

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiUrl: string;
  webUrl: string;
  mongoUri: string;
  redisUrl: string;
  qdrantUrl: string;
  qdrantApiKey?: string;
  qdrantCollectionName: string;
  githubClientId?: string;
  githubClientSecret?: string;
  githubCallbackUrl?: string;
  sessionSecret: string;
  tokenEncryptionKey: string;
}

export const config: AppConfig = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  apiUrl: process.env.API_URL || "http://localhost:4000",
  webUrl: process.env.WEB_URL || "http://localhost:5173",
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/repomind",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",
  qdrantApiKey: process.env.QDRANT_API_KEY,
  qdrantCollectionName: process.env.QDRANT_COLLECTION_NAME || "repomind_code_chunks",
  githubClientId: process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  githubCallbackUrl: process.env.GITHUB_CALLBACK_URL,
  sessionSecret: process.env.SESSION_SECRET || "repomind-development-session-secret-change-me",
  tokenEncryptionKey:
    process.env.TOKEN_ENCRYPTION_KEY ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
};

// Production environment assertions
if (config.nodeEnv === "production") {
  if (!process.env.SESSION_SECRET || config.sessionSecret === "repomind-development-session-secret-change-me") {
    throw new Error(
      "[FATAL CONFIG] SESSION_SECRET must be set to a secure, random string in production environment.",
    );
  }
  if (
    !process.env.TOKEN_ENCRYPTION_KEY ||
    config.tokenEncryptionKey === "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" ||
    config.tokenEncryptionKey.length !== 64 ||
    !/^[0-9a-fA-F]{64}$/.test(config.tokenEncryptionKey)
  ) {
    throw new Error(
      "[FATAL CONFIG] TOKEN_ENCRYPTION_KEY must be a valid 64-character hex string (32 bytes) in production environment.",
    );
  }
}

