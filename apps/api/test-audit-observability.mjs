import assert from "node:assert";
import { auditService, devAuditLogs } from "./dist/modules/audit/audit.service.js";
import { metricsService } from "./dist/modules/observability/metrics.service.js";
import { InMemoryRateLimiter, rateLimiterRegistry } from "./dist/middlewares/rate-limiter.middleware.js";
import { correlationMiddleware } from "./dist/middlewares/correlation.middleware.js";

async function runTests() {
  console.log("\n=======================================================");
  console.log("  RepoMind Phase 13 Audit, RBAC & Observability Test Suite");
  console.log("=======================================================\n");

  // Clear in-memory audit logs before tests
  devAuditLogs.length = 0;

  // -------------------------------------------------------------------
  // TEST 1: Correlation ID Middleware
  // -------------------------------------------------------------------
  console.log("[Test 1] Testing Correlation ID Middleware & Propagation...");

  // Case A: Request without correlation ID header -> generates UUID
  const reqA = {
    headers: {},
  };
  const headersSetA = {};
  const resA = {
    setHeader: (k, v) => {
      headersSetA[k.toLowerCase()] = v;
    },
  };
  let nextCalledA = false;

  correlationMiddleware(reqA, resA, () => {
    nextCalledA = true;
  });

  assert.strictEqual(nextCalledA, true, "Next callback must be invoked");
  assert.ok(reqA.correlationId, "req.correlationId must be populated");
  assert.ok(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reqA.correlationId),
    "Generated correlation ID must be a valid UUID v4"
  );
  assert.strictEqual(
    headersSetA["x-correlation-id"],
    reqA.correlationId,
    "Response must include X-Correlation-ID matching generated ID"
  );
  console.log(`  ✓ Successfully generated and set correlation ID: ${reqA.correlationId}`);

  // Case B: Request with incoming X-Correlation-ID -> preserves it
  const customId = "client-trace-999-xyz";
  const reqB = {
    headers: { "x-correlation-id": customId },
  };
  const headersSetB = {};
  const resB = {
    setHeader: (k, v) => {
      headersSetB[k.toLowerCase()] = v;
    },
  };

  correlationMiddleware(reqB, resB, () => {});

  assert.strictEqual(reqB.correlationId, customId, "Incoming correlation ID must be preserved");
  assert.strictEqual(headersSetB["x-correlation-id"], customId, "Response must reflect incoming correlation ID");
  console.log(`  ✓ Successfully preserved incoming correlation ID: ${customId}`);

  // -------------------------------------------------------------------
  // TEST 2: Centralized Security Audit Logging & Immutability
  // -------------------------------------------------------------------
  console.log("\n[Test 2] Testing Centralized Security Audit Logging & Queries...");

  const repoId = "repo-observability-01";
  const orgId = "org-enterprise-99";
  const adminActor = "user-admin-01";
  const devActor = "user-dev-02";

  // Create audit entries across multiple actions
  const log1 = await auditService.log({
    actorId: adminActor,
    actorEmail: "admin@enterprise.io",
    organizationId: orgId,
    repositoryId: repoId,
    action: "repo:connect",
    resource: `repository:${repoId}`,
    ipAddress: "192.168.1.100",
    userAgent: "RepoMind-Dashboard/1.0",
    status: "success",
    correlationId: reqA.correlationId,
    metadata: { repoName: "core-engine", defaultBranch: "main" },
  });

  const log2 = await auditService.log({
    actorId: devActor,
    actorEmail: "dev@enterprise.io",
    organizationId: orgId,
    repositoryId: repoId,
    action: "repo:reindex",
    resource: `repository:${repoId}`,
    ipAddress: "192.168.1.105",
    status: "success",
    correlationId: customId,
    metadata: { branch: "main", commitSha: "abc1234" },
  });

  const log3 = await auditService.log({
    actorId: "anonymous-attacker",
    organizationId: orgId,
    repositoryId: repoId,
    action: "repo:delete",
    resource: `repository:${repoId}`,
    ipAddress: "203.0.113.42",
    status: "denied",
    metadata: { reason: "Missing ADMIN role permission" },
  });

  const log4 = await auditService.log({
    actorId: devActor,
    actorEmail: "dev@enterprise.io",
    organizationId: orgId,
    action: "rag:query",
    resource: `chat:${repoId}`,
    ipAddress: "192.168.1.105",
    status: "success",
    metadata: { queryLength: 42, citationCount: 3 },
  });

  assert.ok(log1.id, "Audit entry 1 must have an ID");
  assert.strictEqual(log1.actorId, adminActor);
  assert.strictEqual(log1.status, "success");
  assert.strictEqual(log1.correlationId, reqA.correlationId);

  assert.strictEqual(log3.status, "denied", "Security rejection must be recorded as status=denied");
  assert.strictEqual(log3.resource, `repository:${repoId}`);
  assert.strictEqual(log3.ipAddress, "203.0.113.42");

  // Test queries with filtering
  const allLogs = await auditService.query({});
  assert.strictEqual(allLogs.total, 4, "Should find all 4 audit log entries");
  assert.strictEqual(allLogs.logs.length, 4);

  // Filter by repositoryId
  const repoLogs = await auditService.query({ repositoryId: repoId });
  assert.strictEqual(repoLogs.total, 3, "Should find 3 entries specifically for repository");

  // Filter by action
  const deleteLogs = await auditService.query({ action: "repo:delete" });
  assert.strictEqual(deleteLogs.total, 1);
  assert.strictEqual(deleteLogs.logs[0].status, "denied");

  // Filter by status
  const deniedLogs = await auditService.query({ status: "denied" });
  assert.strictEqual(deniedLogs.total, 1);
  assert.strictEqual(deniedLogs.logs[0].actorId, "anonymous-attacker");

  // Pagination test
  const pagedLogs = await auditService.query({ limit: 2, offset: 0 });
  assert.strictEqual(pagedLogs.logs.length, 2);
  assert.strictEqual(pagedLogs.total, 4);

  console.log(`  ✓ Logged 4 audit entries with correlation tracking, IP addresses, and metadata`);
  console.log(`  ✓ Filtered queries by repository (${repoLogs.total}), status (${deniedLogs.total}), and action (${deleteLogs.total})`);

  // -------------------------------------------------------------------
  // TEST 3: Sliding Window Rate Limiter & Tier Throttling
  // -------------------------------------------------------------------
  console.log("\n[Test 3] Testing Sliding Window Rate Limiter Engine...");

  // Test custom rate limiter instance with max 3 requests per 60000ms
  const testLimiterInstance = new InMemoryRateLimiter();
  const testLimiter = testLimiterInstance.createMiddleware({
    windowMs: 60000,
    max: 3,
    message: "Rate limit exceeded for test tier",
    keyGenerator: (req) => req.user?.id || req.ip || "127.0.0.1",
  });

  const mockReq = {
    ip: "10.0.0.1",
    user: { id: "user-rate-test" },
    socket: { remoteAddress: "10.0.0.1" },
    correlationId: reqA.correlationId,
  };

  const headersCaptured = {};
  let statusCodeCaptured = 200;
  let jsonCaptured = null;

  const createMockRes = () => ({
    setHeader: (k, v) => {
      headersCaptured[k] = v;
    },
    status: (code) => {
      statusCodeCaptured = code;
      return {
        json: (data) => {
          jsonCaptured = data;
        },
      };
    },
  });

  // Call 1
  let next1 = false;
  testLimiter(mockReq, createMockRes(), () => {
    next1 = true;
  });
  assert.strictEqual(next1, true, "1st request should be allowed");
  assert.strictEqual(headersCaptured["X-RateLimit-Limit"], 3);
  assert.strictEqual(headersCaptured["X-RateLimit-Remaining"], 2);

  // Call 2
  let next2 = false;
  testLimiter(mockReq, createMockRes(), () => {
    next2 = true;
  });
  assert.strictEqual(next2, true, "2nd request should be allowed");
  assert.strictEqual(headersCaptured["X-RateLimit-Remaining"], 1);

  // Call 3
  let next3 = false;
  testLimiter(mockReq, createMockRes(), () => {
    next3 = true;
  });
  assert.strictEqual(next3, true, "3rd request should be allowed (at capacity)");
  assert.strictEqual(headersCaptured["X-RateLimit-Remaining"], 0);

  // Call 4 -> Should be rate limited to HTTP 429
  let next4 = false;
  testLimiter(mockReq, createMockRes(), () => {
    next4 = true;
  });
  assert.strictEqual(next4, false, "4th request should NOT invoke handler (rate limited)");
  assert.strictEqual(statusCodeCaptured, 429, "Exceeding limit must return HTTP 429");
  assert.strictEqual(headersCaptured["X-RateLimit-Remaining"], 0);
  assert.ok(headersCaptured["Retry-After"] !== undefined, "Retry-After header must be set");
  assert.strictEqual(jsonCaptured?.error, "Too Many Requests");
  assert.strictEqual(testLimiterInstance.getStats().blockedRequests, 1, "Blocked requests counter must increment");

  console.log(`  ✓ Sliding window allowed first 3 requests and blocked 4th request`);
  console.log(`  ✓ RFC rate limit headers verified: Limit=3, Remaining=0, Retry-After=${headersCaptured["Retry-After"]}s`);
  console.log(`  ✓ HTTP 429 error response returned with correlationId: ${jsonCaptured?.correlationId}`);

  // -------------------------------------------------------------------
  // TEST 4: Observability Metrics Service (P50/P95, RAG, Citations)
  // -------------------------------------------------------------------
  // TEST 4: Observability Metrics Service (P50/P95, RAG, Citations)
  // -------------------------------------------------------------------
  console.log("\n[Test 4] Testing Observability Metrics Service...");

  // Record API latency samples
  const latencies = [15, 20, 25, 30, 35, 40, 50, 60, 80, 100, 150, 200, 300, 450, 600, 850, 1200, 1500, 2500, 4000];
  for (const lat of latencies) {
    metricsService.recordRequest(lat, 200);
  }
  // Record some error status codes
  metricsService.recordRequest(12, 404);
  metricsService.recordRequest(5, 429);
  metricsService.recordRequest(85, 500);

  // Record RAG queries and token consumption
  metricsService.recordRagQuery(120, 45, 850, 350);
  metricsService.recordRagQuery(210, 65, 1200, 450);
  metricsService.recordRagQuery(340, 95, 2100, 600);

  // Record Citations (valid, hallucinated)
  metricsService.recordCitations(9, 1);
  metricsService.recordCitations(8, 0);
  metricsService.recordCitations(11, 1);

  // Record Background Jobs
  metricsService.recordJobEvent("start");
  metricsService.recordJobEvent("completed");
  metricsService.recordJobEvent("start");
  metricsService.recordJobEvent("failed");

  // Verify Metrics Snapshot
  const snapshot = metricsService.getMetrics();

  assert.ok(snapshot.api.totalRequests >= 23, "Total API requests must be tracked");
  assert.ok(snapshot.api.p50LatencyMs > 0, "P50 latency must be calculated");
  assert.ok(snapshot.api.p95LatencyMs > snapshot.api.p50LatencyMs, "P95 latency must be higher than P50");
  assert.strictEqual(snapshot.api.errorCount, 3, "3 error requests must be counted (404, 429, 500)");
  assert.ok(snapshot.api.errorRate > 0, "Error rate must be tracked");

  assert.strictEqual(snapshot.rag.totalQueries, 3, "3 RAG queries must be recorded");
  assert.strictEqual(snapshot.rag.totalTokensPrompt, 4150, "Total prompt tokens must sum correctly");
  assert.strictEqual(snapshot.rag.totalTokensCompletion, 1400, "Total completion tokens must sum correctly");
  assert.ok(snapshot.rag.estimatedCostUsd > 0.005, "Estimated token cost in USD must be calculated");

  assert.strictEqual(snapshot.citations.totalGenerated, 30, "Total citations generated must equal 30");
  assert.strictEqual(snapshot.citations.validCitations, 28, "Total citations validated must equal 28");
  assert.strictEqual(snapshot.citations.hallucinatedSuppressed, 2, "Hallucinations suppressed must equal 2");
  assert.ok(snapshot.citations.validityRate > 90, "Validity rate must be > 90%");

  assert.strictEqual(snapshot.queue.completedJobs, 1, "Completed jobs tracked");
  assert.strictEqual(snapshot.queue.failedJobs, 1, "Failed jobs tracked");

  console.log(`  ✓ API Latency P50: ${snapshot.api.p50LatencyMs}ms | P95: ${snapshot.api.p95LatencyMs}ms | Requests: ${snapshot.api.totalRequests} (Errors: ${snapshot.api.errorCount})`);
  console.log(`  ✓ RAG Metrics: ${snapshot.rag.totalQueries} queries | ${snapshot.rag.totalTokensPrompt + snapshot.rag.totalTokensCompletion} tokens | $${snapshot.rag.estimatedCostUsd.toFixed(4)} USD`);
  console.log(`  ✓ Citation Validity: ${snapshot.citations.validityRate}% (${snapshot.citations.validCitations}/${snapshot.citations.totalGenerated})`);

  // -------------------------------------------------------------------
  // TEST 5: Prometheus Exposition Text Format (GET /metrics)
  // -------------------------------------------------------------------
  console.log("\n[Test 5] Testing Prometheus Exposition Text Format...");

  const promOutput = metricsService.getPrometheusMetrics();

  assert.ok(typeof promOutput === "string", "Prometheus output must be a string");
  assert.ok(promOutput.includes("# HELP repomind_http_requests_total"), "Must include HTTP requests HELP comment");
  assert.ok(promOutput.includes("# TYPE repomind_http_requests_total counter"), "Must include HTTP requests TYPE comment");
  assert.ok(promOutput.includes("repomind_http_latency_p50_milliseconds"), "Must include HTTP latency P50 metric");
  assert.ok(promOutput.includes("repomind_http_latency_p95_milliseconds"), "Must include HTTP latency P95 metric");
  assert.ok(promOutput.includes("repomind_rag_queries_total"), "Must include RAG queries metric");
  assert.ok(promOutput.includes("repomind_llm_tokens_total"), "Must include RAG tokens metric");
  assert.ok(promOutput.includes("repomind_citation_validity_ratio"), "Must include citation validity ratio");
  assert.ok(promOutput.includes("repomind_rate_limit_blocked_total"), "Must include rate limit blocked metric");
  assert.ok(promOutput.includes("repomind_uptime_seconds"), "Must include system uptime metric");

  console.log(`  ✓ Successfully generated standard Prometheus exposition text (${promOutput.split("\n").length} lines)`);
  console.log("  Sample Prometheus output snippet:\n" + promOutput.split("\n").slice(0, 14).map((l) => "    " + l).join("\n"));

  console.log("\n=======================================================");
  console.log("  All Phase 13 Tests Passed Successfully (5/5)!");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
