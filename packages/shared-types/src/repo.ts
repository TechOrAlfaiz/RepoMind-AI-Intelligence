export type IndexStatus = "pending" | "indexing" | "indexed" | "failed";

export interface Repository {
  id: string;
  organizationId: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  defaultBranch: string;
  branch: string;
  isPrivate: boolean;
  indexStatus: IndexStatus;
  lastIndexedAt: string | null;
  currentCommitSha: string | null;
  indexVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectRepoDTO {
  organizationId: string;
  githubRepoId: number;
  name: string;
  fullName: string;
  defaultBranch: string;
  branch?: string;
  isPrivate: boolean;
}

export interface GitHubRepoListItem {
  id: number;
  name: string;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  description: string | null;
  updatedAt: string;
}

export interface RepoSummary extends Repository {
  fileCount?: number;
  chunkCount?: number;
}

export interface FileRecord {
  id: string;
  repositoryId: string;
  path: string;
  language: string;
  contentHash: string;
  latestSha: string;
  size: number;
  content?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IngestionJobPayload {
  repositoryId: string;
  userId: string;
  triggeredAt: string;
}

export interface IngestionProgress {
  totalFiles: number;
  processedFiles: number;
  currentFile?: string;
  status: IndexStatus;
}

export interface IngestionProgressEvent {
  repositoryId: string;
  stage: "fetching" | "filtering" | "chunking" | "embedding" | "completed" | "error";
  processedFiles: number;
  totalFiles: number;
  percent: number;
  message?: string;
  currentFile?: string;
  timestamp?: string;
}

export interface PushWebhookCommitDiff {
  repositoryId: string;
  ref: string;
  beforeSha: string;
  afterSha: string;
  added: string[];
  modified: string[];
  removed: string[];
}

