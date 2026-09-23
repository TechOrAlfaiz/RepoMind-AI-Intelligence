export interface ApiMetrics {
  totalRequests: number;
  activeRequests: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  errorCount: number;
  errorRate: number;
}

export interface QueueMetrics {
  queueDepth: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  failureRate: number;
}

export interface RagMetrics {
  totalQueries: number;
  avgRetrievalLatencyMs: number;
  avgRerankLatencyMs: number;
  totalTokensPrompt: number;
  totalTokensCompletion: number;
  estimatedCostUsd: number;
}

export interface CitationMetrics {
  totalGenerated: number;
  validCitations: number;
  hallucinatedSuppressed: number;
  validityRate: number;
}

export interface RateLimitingMetrics {
  blockedRequests: number;
  activeTrackedKeys: number;
}

export interface SystemMetrics {
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  api: ApiMetrics;
  queue: QueueMetrics;
  rag: RagMetrics;
  citations: CitationMetrics;
  rateLimiting: RateLimitingMetrics;
}
