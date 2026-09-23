import dns from "node:dns";
import mongoose from "mongoose";
import { config } from "./env.js";

let isConnected = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    return;
  }

  // Ensure SRV records resolve properly on Windows environments
  if (config.mongoUri.startsWith("mongodb+srv://")) {
    try {
      dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
    } catch {
      // Ignore if DNS server configuration is restricted
    }
  }

  try {
    mongoose.connection.on("connected", () => {
      isConnected = true;
      console.log("[RepoMind DB] Successfully connected to MongoDB.");
    });

    mongoose.connection.on("error", (err) => {
      console.error("[RepoMind DB] MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      isConnected = false;
      console.warn("[RepoMind DB] MongoDB disconnected.");
    });

    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
  } catch (err: any) {
    console.warn(`[RepoMind DB] Could not connect to MongoDB at ${config.mongoUri}: ${err.message}`);
    if (config.nodeEnv === "production") {
      throw err;
    }
  }
}

export function isDbConnected(): boolean {
  return isConnected || mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
  }
}
