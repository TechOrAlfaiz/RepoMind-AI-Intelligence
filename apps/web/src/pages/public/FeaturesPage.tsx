import React from "react";
import { Link } from "react-router-dom";
import {
  Terminal,
  FileCode,
  Network,
  Bug,
  GitPullRequest,
  Activity,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const FeaturesPage: React.FC = () => {
  const features = [
    {
      id: "chat",
      icon: Terminal,
      tag: "CONVERSATIONAL RETRIEVAL",
      title: "Grounded AI Code Chat",
      desc: "Ask complex architectural, operational, or implementation questions across your entire repository. Streaming SSE responses include validated source citations.",
      bullets: [
        "Language-native Tree-sitter AST symbol boundaries",
        "Deterministic [CTX-n] citations linking to exact line numbers",
        "Active file context awareness for instant 'explain this file' queries",
      ],
    },
    {
      id: "explorer",
      icon: FileCode,
      tag: "SOURCE NAVIGATION",
      title: "Interactive Code Explorer",
      desc: "An IDE-style hierarchical file tree with syntax-highlighted code inspection powered by Monaco Editor.",
      bullets: [
        "Recursive file and directory browsing with real-time filtering",
        "High-contrast glowing line-range highlights when citations are selected",
        "Direct GitHub file permalinks and instant clipboard copying",
      ],
    },
    {
      id: "architecture",
      icon: Network,
      tag: "STATIC ANALYSIS",
      title: "Architecture & Dependency Graph",
      desc: "Automatically extracts import statements and call chains to render module relationships, subsystem clustering, and circular dependencies.",
      bullets: [
        "Detects cyclic import hazards before they hit staging",
        "Visualizes coupling degrees and module fan-in / fan-out",
        "Interactive canvas navigation with node zooming and details panel",
      ],
    },
    {
      id: "bugs",
      icon: Bug,
      tag: "ROOT-CAUSE DIAGNOSIS",
      title: "Cross-File Bug Investigator",
      desc: "Trace stack traces, unhandled exceptions, and edge cases across services with verified call-stack synthesis.",
      bullets: [
        "Multi-step investigation timeline from symptom to verified patch",
        "Grounded code citations for every suspected function caller",
        "Generates clean git-diff patches for copy-paste remediation",
      ],
    },
    {
      id: "pr",
      icon: GitPullRequest,
      tag: "CHANGE INTELLIGENCE",
      title: "Automated Pull Request Advisor",
      desc: "Deep analysis of GitHub PR diffs against the entire repository context to detect architectural hazards.",
      bullets: [
        "Evaluates breaking API changes across consumer services",
        "Identifies missing unit test coverage on critical changed branches",
        "Synthesizes concise executive summaries for senior reviewer sign-off",
      ],
    },
    {
      id: "telemetry",
      icon: Activity,
      tag: "OBSERVABILITY & AUDIT",
      title: "System Invariants & Telemetry",
      desc: "Production metrics reporting token usage, retrieval latency, AST chunk counts, and cryptographic audit logs.",
      bullets: [
        "Sub-25ms hybrid vector cosine and BM25 retrieval latency",
        "Zero-hallucination verification telemetry",
        "Cryptographically signed audit logs with tamper detection",
      ],
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 uppercase">
          Comprehensive Capabilities
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Engineered for Complex Repositories
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Every tool inside RepoMind is built around verified AST code grounding. Explore each core intelligence pillar below.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.id}
              id={f.id}
              className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.07] hover:border-indigo-500/30 transition flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{f.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>

                <div className="space-y-2 pt-2 border-t border-white/[0.04]">
                  {f.bullets.map((b, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/app/dashboard"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition"
                >
                  <span>Launch in App</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA Box */}
      <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-indigo-950/60 to-slate-900/60 border border-indigo-500/20 text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">Experience Grounded Code Intelligence</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Connect your GitHub repository to index AST chunks and start querying with verified citations.
        </p>
        <div className="pt-2">
          <Link
            to="/app/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition"
          >
            <span>Open Application</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
