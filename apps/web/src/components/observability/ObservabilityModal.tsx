import { useState, useEffect } from "react";
import {
  Activity,
  ShieldCheck,
  Zap,
  Clock,
  Coins,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Lock,
} from "lucide-react";
import type { SystemMetrics, AuditLog } from "@repomind/shared-types";

interface ObservabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ObservabilityModal({ isOpen, onClose }: ObservabilityModalProps) {
  const [activeTab, setActiveTab] = useState<"metrics" | "audit">("metrics");
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditFilter, setAuditFilter] = useState("");
  const [promPreview, setPromPreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMetrics();
      loadAuditLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  async function loadMetrics() {
    setLoadingMetrics(true);
    try {
      const res = await fetch("http://localhost:4000/api/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
      const promRes = await fetch("http://localhost:4000/metrics");
      if (promRes.ok) {
        const text = await promRes.text();
        setPromPreview(text);
      }
    } catch (e) {
      console.error("Failed to load system metrics:", e);
    } finally {
      setLoadingMetrics(false);
    }
  }

  async function loadAuditLogs() {
    setLoadingAudit(true);
    try {
      const res = await fetch("http://localhost:4000/api/audit-logs?limit=50");
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Failed to load audit logs:", e);
    } finally {
      setLoadingAudit(false);
    }
  }

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(auditFilter.toLowerCase()) ||
      l.resource.toLowerCase().includes(auditFilter.toLowerCase()) ||
      (l.actorEmail && l.actorEmail.toLowerCase().includes(auditFilter.toLowerCase())) ||
      l.actorId.toLowerCase().includes(auditFilter.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white text-lg font-bold shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Observability, Audit Trail & Health Metrics
              </h2>
              <p className="text-xs text-slate-400">
                Live Prometheus Telemetry, RAG Cost Accounting & Security Governance
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab("metrics")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "metrics"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Live Metrics & Prometheus
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "audit"
                  ? "bg-emerald-600 text-white shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Security Audit Logs ({auditLogs.length})
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: METRICS & OBSERVABILITY */}
          {activeTab === "metrics" && (
            <div className="space-y-6">
              {/* Header Actions */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Realtime performance monitoring with P50/P95 latencies and token usage accounting.
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href="http://localhost:4000/metrics"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open /metrics
                  </a>
                  <button
                    onClick={loadMetrics}
                    disabled={loadingMetrics}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingMetrics ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
              </div>

              {/* KPI Cards Grid */}
              {metrics && (
                <div className="grid grid-cols-4 gap-3">
                  {/* API Latency Card */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                      <span>API Latency</span>
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {metrics.api.p50LatencyMs} <span className="text-xs text-slate-500 font-normal">ms (P50)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      P95: <span className="text-cyan-400">{metrics.api.p95LatencyMs}ms</span> &bull; {metrics.api.totalRequests} reqs
                    </div>
                  </div>

                  {/* Citation Validity Card */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                      <span>Citation Validity</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-emerald-400">
                      {metrics.citations.validityRate}%
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {metrics.citations.validCitations} valid &bull; {metrics.citations.hallucinatedSuppressed} suppressed
                    </div>
                  </div>

                  {/* LLM Token Usage & Cost */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                      <span>LLM Token Cost</span>
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-amber-300">
                      ${metrics.rag.estimatedCostUsd}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {metrics.rag.totalTokensPrompt + metrics.rag.totalTokensCompletion} total tokens
                    </div>
                  </div>

                  {/* Ingestion Queue & Rate Limits */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                      <span>Queue & Rate Limits</span>
                      <Lock className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">
                      {metrics.queue.activeJobs} <span className="text-xs text-slate-500 font-normal">active jobs</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {metrics.rateLimiting.blockedRequests} 429 blocked &bull; {metrics.rateLimiting.activeTrackedKeys} keys
                    </div>
                  </div>
                </div>
              )}

              {/* RAG Engine Performance Metrics */}
              {metrics && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    RAG Knowledge Layer Performance
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                      <div className="text-slate-400">Total RAG Queries</div>
                      <div className="text-lg font-bold text-indigo-400 font-mono mt-0.5">
                        {metrics.rag.totalQueries}
                      </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                      <div className="text-slate-400">Avg Dense Retrieval Latency</div>
                      <div className="text-lg font-bold text-sky-400 font-mono mt-0.5">
                        {metrics.rag.avgRetrievalLatencyMs} ms
                      </div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                      <div className="text-slate-400">Avg BM25 & Reranking Latency</div>
                      <div className="text-lg font-bold text-purple-400 font-mono mt-0.5">
                        {metrics.rag.avgRerankLatencyMs} ms
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Prometheus Text Scraper Preview */}
              {promPreview && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Prometheus Exporter Format Preview (/metrics)
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-mono">200 OK &bull; text/plain; version=0.0.4</span>
                  </div>
                  <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto max-h-56 leading-relaxed">
                    {promPreview}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: AUDIT LOGS */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              {/* Filter and Refresh Bar */}
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  value={auditFilter}
                  onChange={(e) => setAuditFilter(e.target.value)}
                  placeholder="Filter by action, resource, or actor email..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 font-mono"
                />
                <button
                  onClick={loadAuditLogs}
                  disabled={loadingAudit}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {/* Audit Table */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="max-h-[420px] overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2.5">Timestamp</th>
                        <th className="px-4 py-2.5">Action</th>
                        <th className="px-4 py-2.5">Resource</th>
                        <th className="px-4 py-2.5">Actor</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">IP Address</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                            No audit log records found matching query.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-900/50 transition">
                            <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap text-[11px]">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                                {log.action}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 truncate max-w-xs text-slate-200">
                              {log.resource}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-slate-400 truncate max-w-xs">
                              {log.actorEmail || log.actorId}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  log.status === "success"
                                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                    : log.status === "denied"
                                      ? "bg-amber-950 text-amber-300 border border-amber-800"
                                      : "bg-rose-950 text-rose-300 border border-rose-800"
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap text-slate-500 text-[11px]">
                              {log.ipAddress}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs text-slate-500">
          <span>
            Strict Invariant: Immutable audit logging & Prometheus telemetry enabled.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
