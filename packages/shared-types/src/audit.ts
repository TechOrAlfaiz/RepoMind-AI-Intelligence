export type AuditAction =
  | "repo:connect"
  | "repo:delete"
  | "repo:reindex"
  | "org:create"
  | "org:member_invite"
  | "org:role_update"
  | "webhook:received"
  | "pr:analyze"
  | "bug:investigate"
  | "rag:query"
  | "auth:login"
  | "auth:logout";

export type AuditStatus = "success" | "failure" | "denied";

export interface AuditLog {
  id: string;
  actorId: string;
  actorEmail?: string | null;
  organizationId?: string;
  repositoryId?: string;
  action: AuditAction | string;
  resource: string;
  ipAddress: string;
  userAgent?: string;
  status: AuditStatus;
  correlationId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface CreateAuditLogInput {
  actorId: string;
  actorEmail?: string | null;
  organizationId?: string;
  repositoryId?: string;
  action: AuditAction | string;
  resource: string;
  ipAddress?: string;
  userAgent?: string;
  status: AuditStatus;
  correlationId?: string;
  metadata?: Record<string, any>;
}

export interface AuditLogQuery {
  organizationId?: string;
  repositoryId?: string;
  actorId?: string;
  action?: string;
  status?: AuditStatus;
  limit?: number;
  skip?: number;
}
