import mongoose from "mongoose";
import { isDbConnected } from "../../config/database.js";
import { AuditModel } from "./models/audit.model.js";
import type { Request } from "express";
import type { AuditLog, CreateAuditLogInput, AuditLogQuery } from "@repomind/shared-types";

// In-memory audit log store for offline local testing
export const devAuditLogs: AuditLog[] = [];

export class AuditService {
  /**
   * Records an immutable audit log entry.
   */
  async log(entry: CreateAuditLogInput): Promise<AuditLog> {
    const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const record: AuditLog = {
      id,
      actorId: entry.actorId,
      actorEmail: entry.actorEmail,
      organizationId: entry.organizationId,
      repositoryId: entry.repositoryId,
      action: entry.action,
      resource: entry.resource,
      ipAddress: entry.ipAddress || "127.0.0.1",
      userAgent: entry.userAgent,
      status: entry.status,
      correlationId: entry.correlationId,
      metadata: entry.metadata || {},
      timestamp: new Date().toISOString(),
    };

    if (!isDbConnected()) {
      devAuditLogs.unshift(record);
      if (devAuditLogs.length > 500) {
        devAuditLogs.pop();
      }
      return record;
    }

    try {
      const doc = await AuditModel.create({
        actorId: entry.actorId,
        actorEmail: entry.actorEmail,
        organizationId: entry.organizationId
          ? new mongoose.Types.ObjectId(entry.organizationId)
          : undefined,
        repositoryId: entry.repositoryId
          ? new mongoose.Types.ObjectId(entry.repositoryId)
          : undefined,
        action: entry.action,
        resource: entry.resource,
        ipAddress: entry.ipAddress || "127.0.0.1",
        userAgent: entry.userAgent,
        status: entry.status,
        correlationId: entry.correlationId,
        metadata: entry.metadata || {},
      });

      return doc.toClient();
    } catch (err: any) {
      console.error("[RepoMind Audit] Failed to persist audit record:", err.message);
      devAuditLogs.unshift(record);
      return record;
    }
  }

  /**
   * Queries audit logs with pagination and filters.
   */
  async query(filters: AuditLogQuery = {}): Promise<{ logs: AuditLog[]; total: number }> {
    const limit = Math.min(filters.limit || 50, 100);
    const skip = filters.skip || 0;

    if (!isDbConnected()) {
      let filtered = [...devAuditLogs];
      if (filters.organizationId) {
        filtered = filtered.filter((l) => l.organizationId === filters.organizationId);
      }
      if (filters.repositoryId) {
        filtered = filtered.filter((l) => l.repositoryId === filters.repositoryId);
      }
      if (filters.actorId) {
        filtered = filtered.filter((l) => l.actorId === filters.actorId);
      }
      if (filters.action) {
        filtered = filtered.filter((l) => l.action === filters.action);
      }
      if (filters.status) {
        filtered = filtered.filter((l) => l.status === filters.status);
      }

      const total = filtered.length;
      return {
        logs: filtered.slice(skip, skip + limit),
        total,
      };
    }

    const query: any = {};
    if (filters.organizationId) {
      query.organizationId = new mongoose.Types.ObjectId(filters.organizationId);
    }
    if (filters.repositoryId) {
      query.repositoryId = new mongoose.Types.ObjectId(filters.repositoryId);
    }
    if (filters.actorId) query.actorId = filters.actorId;
    if (filters.action) query.action = filters.action;
    if (filters.status) query.status = filters.status;

    const [docs, total] = await Promise.all([
      AuditModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AuditModel.countDocuments(query),
    ]);

    return {
      logs: docs.map((d) => d.toClient()),
      total,
    };
  }

  /**
   * Helper to extract request actor & client metadata from Express request.
   */
  extractRequestMeta(req: Request) {
    const user = (req as any).session?.user || (req as any).user;
    return {
      actorId: user?.id || "anonymous",
      actorEmail: user?.email,
      ipAddress:
        (req.headers["x-forwarded-for"] as string) ||
        req.socket.remoteAddress ||
        "127.0.0.1",
      userAgent: req.headers["user-agent"],
      correlationId: req.correlationId,
    };
  }
}

export const auditService = new AuditService();
