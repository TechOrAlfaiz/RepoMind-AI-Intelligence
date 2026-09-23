import React from "react";
import { GitBranch, Boxes, Search, Cpu, CheckCircle2 } from "lucide-react";

interface PipelineStep {
  id: string;
  title: string;
  badge: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: "repo",
    title: "Git Repository",
    badge: "INPUT",
    desc: "Tree fetch & SHA-256 differential content hashing",
    icon: GitBranch,
  },
  {
    id: "ast",
    title: "AST Chunker",
    badge: "TREE-SITTER",
    desc: "Precise function, class, and interface boundaries",
    icon: Boxes,
  },
  {
    id: "hybrid",
    title: "Hybrid Fusion",
    badge: "BM25 + VECTOR",
    desc: "Reciprocal rank fusion (k=60) with tenant isolation",
    icon: Search,
  },
  {
    id: "llm",
    title: "LLM Reasoner",
    badge: "SYNTHESIS",
    desc: "Context sandboxing with strict citation formatting",
    icon: Cpu,
  },
  {
    id: "answer",
    title: "Cited Answer",
    badge: "ZERO HALLUCINATION",
    desc: "Line-verified citations clickable into Monaco editor",
    icon: CheckCircle2,
  },
];

export const LandingPipeline: React.FC = () => {
  return (
    <div className="w-full max-w-5xl mx-auto my-12 p-6 rounded-2xl bg-panel/80 border border-subtle relative overflow-hidden backdrop-blur-md shadow-2xl">
      {/* Background glow effects */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-structural/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8 border-b border-subtle/80 pb-4">
        <div>
          <span className="text-[11px] font-mono text-accent font-semibold tracking-wider uppercase">
            Execution Pipeline Architecture
          </span>
          <h3 className="text-lg font-semibold text-text-primary tracking-tight">
            Deterministic Grounding Pipeline
          </h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-text-muted bg-panel-2 px-3 py-1.5 rounded-lg border border-subtle">
          <span className="w-2 h-2 rounded-full bg-success motion-safe:animate-ping" />
          <span className="text-text-secondary">Latency: ~280ms P95</span>
        </div>
      </div>

      {/* Pipeline Stages Grid with Connecting Track */}
      <div className="relative">
        {/* Animated Connecting Track Line for Desktop */}
        <div className="hidden lg:block absolute top-7 left-12 right-12 h-[2px] bg-border-subtle z-0 overflow-hidden">
          {/* Animated Traveling Pulse Dot */}
          <div className="w-24 h-full bg-gradient-to-r from-transparent via-accent to-transparent motion-safe:animate-[travel_3s_linear_infinite]" />
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative z-10">
          {PIPELINE_STEPS.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className="flex flex-col p-4 rounded-xl bg-panel-2/90 border border-subtle hover:border-accent/50 transition-all group relative"
              >
                {/* Step Number & Icon Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-panel border border-subtle flex items-center justify-center text-text-primary group-hover:border-accent group-hover:text-accent transition-colors shadow-sm">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-panel border border-subtle text-text-muted">
                    0{index + 1}
                  </span>
                </div>

                {/* Badge */}
                <span className="text-[9px] font-mono font-semibold tracking-wider text-accent uppercase mb-1">
                  {step.badge}
                </span>

                {/* Title */}
                <h4 className="text-sm font-semibold text-text-primary mb-1">
                  {step.title}
                </h4>

                {/* Description */}
                <p className="text-xs text-text-secondary leading-relaxed flex-1">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom telemetry footer */}
      <div className="mt-8 pt-4 border-t border-subtle/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-text-muted">
        <div className="flex items-center gap-4">
          <span>
            <strong className="text-text-secondary">Parser:</strong> Tree-sitter AST
          </span>
          <span>&bull;</span>
          <span>
            <strong className="text-text-secondary">Search:</strong> BM25 + Qdrant
          </span>
          <span>&bull;</span>
          <span>
            <strong className="text-text-secondary">Precision:</strong> Line-Level Verified
          </span>
        </div>
        <span className="text-accent text-[11px]">
          [Reduced Motion Respected]
        </span>
      </div>

      {/* Inline animation keyframe for traveling pulse */}
      <style>{`
        @keyframes travel {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(500%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .motion-safe\\:animate-\\[travel_3s_linear_infinite\\] {
            animation: none !important;
            opacity: 0.3;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};
