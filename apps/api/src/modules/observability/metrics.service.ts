import { rateLimiterRegistry } from "../../middlewares/rate-limiter.middleware.js";
import type { SystemMetrics } from "@repomind/shared-types";

class MetricsService {
  private startTime = Date.now();
  private requestLatencies: number[] = [];
  private totalRequests = 0;
  private activeRequests = 0;
  private errorCount = 0;

  // RAG Metrics
  private totalRagQueries = 0;
  private retrievalLatencies: number[] = [];
  private rerankLatencies: number[] = [];
  private totalTokensPrompt = 0;
  private totalTokensCompletion = 0;

  // Citation Metrics
  private totalCitationsGenerated = 0;
  private validCitationsCount = 0;
  private hallucinatedCitationsCount = 0;

  // Queue Metrics
  private completedJobs = 0;
  private failedJobs = 0;
  private activeJobs = 0;

  /**
   * Records an API request execution.
   */
  recordRequest(durationMs: number, statusCode: number) {
    this.totalRequests++;
    if (statusCode >= 400) {
      this.errorCount++;
    }
    this.requestLatencies.push(durationMs);
    if (this.requestLatencies.length > 2000) {
      this.requestLatencies.shift();
    }
  }

  incrementActiveRequests() {
    this.activeRequests++;
  }

  decrementActiveRequests() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }

  /**
   * Records RAG retrieval & LLM generation trace metrics.
   */
  recordRagQuery(
    retrievalMs: number,
    rerankMs: number,
    promptTokens: number,
    completionTokens: number,
  ) {
    this.totalRagQueries++;
    this.retrievalLatencies.push(retrievalMs);
    this.rerankLatencies.push(rerankMs);
    this.totalTokensPrompt += promptTokens;
    this.totalTokensCompletion += completionTokens;

    if (this.retrievalLatencies.length > 500) this.retrievalLatencies.shift();
    if (this.rerankLatencies.length > 500) this.rerankLatencies.shift();
  }

  /**
   * Records citation validation outcomes.
   */
  recordCitations(valid: number, hallucinated: number) {
    this.validCitationsCount += valid;
    this.hallucinatedCitationsCount += hallucinated;
    this.totalCitationsGenerated += valid + hallucinated;
  }

  /**
   * Records background job status.
   */
  recordJobEvent(event: "completed" | "failed" | "start") {
    if (event === "completed") {
      this.completedJobs++;
      this.activeJobs = Math.max(0, this.activeJobs - 1);
    } else if (event === "failed") {
      this.failedJobs++;
      this.activeJobs = Math.max(0, this.activeJobs - 1);
    } else if (event === "start") {
      this.activeJobs++;
    }
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, v) => acc + v, 0);
    return Math.round((sum / values.length) * 10) / 10;
  }

  /**
   * Returns structured system metrics JSON.
   */
  getMetrics(): SystemMetrics {
    const rateLimitStats = rateLimiterRegistry.getStats();
    const errorRate =
      this.totalRequests > 0
        ? Math.round((this.errorCount / this.totalRequests) * 10000) / 100
        : 0;

    const totalJobs = this.completedJobs + this.failedJobs;
    const queueFailureRate =
      totalJobs > 0 ? Math.round((this.failedJobs / totalJobs) * 10000) / 100 : 0;

    // Cost estimate: $0.0015 / 1k prompt, $0.002 / 1k completion
    const promptCost = (this.totalTokensPrompt / 1000) * 0.0015;
    const completionCost = (this.totalTokensCompletion / 1000) * 0.002;
    const estimatedCostUsd = Math.round((promptCost + completionCost) * 10000) / 10000;

    const validityRate =
      this.totalCitationsGenerated > 0
        ? Math.round((this.validCitationsCount / this.totalCitationsGenerated) * 10000) / 100
        : 100;

    return {
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
      environment: process.env.NODE_ENV || "development",
      api: {
        totalRequests: this.totalRequests,
        activeRequests: this.activeRequests,
        p50LatencyMs: this.calculatePercentile(this.requestLatencies, 50),
        p95LatencyMs: this.calculatePercentile(this.requestLatencies, 95),
        errorCount: this.errorCount,
        errorRate,
      },
      queue: {
        queueDepth: this.activeJobs,
        activeJobs: this.activeJobs,
        completedJobs: this.completedJobs,
        failedJobs: this.failedJobs,
        failureRate: queueFailureRate,
      },
      rag: {
        totalQueries: this.totalRagQueries,
        avgRetrievalLatencyMs: this.calculateAverage(this.retrievalLatencies),
        avgRerankLatencyMs: this.calculateAverage(this.rerankLatencies),
        totalTokensPrompt: this.totalTokensPrompt,
        totalTokensCompletion: this.totalTokensCompletion,
        estimatedCostUsd,
      },
      citations: {
        totalGenerated: this.totalCitationsGenerated,
        validCitations: this.validCitationsCount,
        hallucinatedSuppressed: this.hallucinatedCitationsCount,
        validityRate,
      },
      rateLimiting: {
        blockedRequests: rateLimitStats.blockedRequests,
        activeTrackedKeys: rateLimitStats.activeTrackedKeys,
      },
    };
  }

  /**
   * Generates Prometheus exposition format text.
   */
  getPrometheusMetrics(): string {
    const m = this.getMetrics();
    const lines: string[] = [
      "# HELP repomind_uptime_seconds Total seconds the server has been running.",
      "# TYPE repomind_uptime_seconds gauge",
      `repomind_uptime_seconds ${m.uptimeSeconds}`,
      "",
      "# HELP repomind_http_requests_total Total number of HTTP requests processed.",
      "# TYPE repomind_http_requests_total counter",
      `repomind_http_requests_total ${m.api.totalRequests}`,
      "",
      "# HELP repomind_http_errors_total Total number of HTTP requests returning 4xx or 5xx status.",
      "# TYPE repomind_http_errors_total counter",
      `repomind_http_errors_total ${m.api.errorCount}`,
      "",
      "# HELP repomind_http_latency_p50_milliseconds 50th percentile of HTTP latency.",
      "# TYPE repomind_http_latency_p50_milliseconds gauge",
      `repomind_http_latency_p50_milliseconds ${m.api.p50LatencyMs}`,
      "",
      "# HELP repomind_http_latency_p95_milliseconds 95th percentile of HTTP latency.",
      "# TYPE repomind_http_latency_p95_milliseconds gauge",
      `repomind_http_latency_p95_milliseconds ${m.api.p95LatencyMs}`,
      "",
      "# HELP repomind_rag_queries_total Total number of RAG queries executed.",
      "# TYPE repomind_rag_queries_total counter",
      `repomind_rag_queries_total ${m.rag.totalQueries}`,
      "",
      "# HELP repomind_rag_retrieval_latency_milliseconds Average vector/hybrid retrieval latency.",
      "# TYPE repomind_rag_retrieval_latency_milliseconds gauge",
      `repomind_rag_retrieval_latency_milliseconds ${m.rag.avgRetrievalLatencyMs}`,
      "",
      "# HELP repomind_rag_rerank_latency_milliseconds Average scoring and reranking latency.",
      "# TYPE repomind_rag_rerank_latency_milliseconds gauge",
      `repomind_rag_rerank_latency_milliseconds ${m.rag.avgRerankLatencyMs}`,
      "",
      "# HELP repomind_llm_tokens_total Total tokens consumed (prompt + completion).",
      "# TYPE repomind_llm_tokens_total counter",
      `repomind_llm_tokens_total{type="prompt"} ${m.rag.totalTokensPrompt}`,
      `repomind_llm_tokens_total{type="completion"} ${m.rag.totalTokensCompletion}`,
      "",
      "# HELP repomind_citation_validity_ratio Ratio of validated citations against hallucinations.",
      "# TYPE repomind_citation_validity_ratio gauge",
      `repomind_citation_validity_ratio ${m.citations.validityRate / 100}`,
      "",
      "# HELP repomind_rate_limit_blocked_total Total requests blocked by rate limiting middleware.",
      "# TYPE repomind_rate_limit_blocked_total counter",
      `repomind_rate_limit_blocked_total ${m.rateLimiting.blockedRequests}`,
      "",
    ];

    return lines.join("\n");
  }
}

export const metricsService = new MetricsService();
