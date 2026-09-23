import React from "react";
import { ArrowRight, ShieldCheck, Terminal, Layers, Cpu, GitBranch, Lock, Activity, FileCode, Sparkles, Heart } from "lucide-react";
import { LandingPipeline } from "./LandingPipeline";

interface LandingPageProps {
  onEnterApp?: () => void;
}

const SPEC_SHEET_ROWS = [
  {
    label: "AST-Aware Chunking",
    tag: "SYNTACTIC GROUNDING",
    icon: Layers,
    description:
      "Language-native Tree-sitter parsers slice repositories at semantic function, class, and interface declaration boundaries rather than arbitrary token counts, maintaining contextual code integrity.",
  },
  {
    label: "Hybrid RRF Retrieval",
    tag: "RECIPROCAL RANK FUSION",
    icon: Cpu,
    description:
      "Combines Qdrant dense vector cosine similarity with deterministic BM25 keyword scoring (k=60), balancing exact identifier lookups against semantic conceptual queries.",
  },
  {
    label: "Post-Gen Citation Validator",
    tag: "ZERO HALLUCINATION",
    icon: ShieldCheck,
    description:
      "Every generated citation is validated post-generation against the repository's active Git tree. Hallucinated context IDs and out-of-range line bounds are automatically suppressed.",
  },
  {
    label: "Differential Ingestion Worker",
    tag: "SUB-SECOND SYNC",
    icon: GitBranch,
    description:
      "BullMQ asynchronous workers process differential push commits, re-chunking and re-embedding only modified files without triggering wasteful full repository re-indexes.",
  },
  {
    label: "Repo Time Machine",
    tag: "HISTORICAL RAG",
    icon: Activity,
    description:
      "Pin queries to historical Git commit SHAs or release tags to understand legacy architecture and inspect how subsystems behaved at points in historical time.",
  },
  {
    label: "Enterprise Security & Audit",
    tag: "PROMETHEUS & AUDIT",
    icon: Lock,
    description:
      "Prometheus metrics reporting token usage and retrieval latencies, cryptographic audit logs with tamper detection, and multi-tenant RBAC enforcement.",
  },
];

const TECH_STACK_CHIPS = [
  "TypeScript 5.8",
  "React 18",
  "Node.js 20",
  "Tree-sitter AST",
  "Qdrant Vector DB",
  "MongoDB Atlas",
  "Redis & BullMQ",
  "Monaco Code Editor",
  "Prometheus Metrics",
  "TailwindCSS",
];

export const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  return (
    <div
      data-theme="landing"
      className="min-h-screen bg-[#080C14] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden relative"
    >
      {/* Ambient Cosmic Aura Light Effects */}
      <div className="aura-glow-top" />
      <div className="aura-glow-corner" />

      {/* 1. Header / Top Navigation */}
      <header className="border-b border-white/[0.07] bg-[#080C14]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/25">
              <div className="w-full h-full bg-[#080C14] rounded-[11px] flex items-center justify-center">
                <Terminal className="w-4 h-4 text-indigo-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">
                RepoMind
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/25">
                v1.0
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-slate-400">
            <a href="#pipeline" className="hover:text-white transition-colors">
              Pipeline
            </a>
            <a href="#principle" className="hover:text-white transition-colors">
              Principle
            </a>
            <a href="#specs" className="hover:text-white transition-colors">
              Spec Matrix
            </a>
            <a href="#showcase" className="hover:text-white transition-colors">
              Workspace
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onEnterApp}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/25 cursor-pointer"
            >
              <span>Launch App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="pt-20 pb-12 px-4 sm:px-6 max-w-5xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-300 mb-8 font-mono shadow-inner backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          <span>Next-Gen Engineering Intelligence & AST Grounding</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
          Code intelligence grounded in{" "}
          <span className="gradient-brand-text">
            line-level truth
          </span>
          .
        </h1>

        <p className="mt-6 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
          High-precision AI platform for engineering teams. Tree-sitter AST syntax boundaries,
          deterministic BM25 + Qdrant hybrid retrieval, and zero-hallucination line citations.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={onEnterApp}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 text-white flex items-center gap-2.5 transition-all shadow-xl shadow-indigo-500/25 cursor-pointer"
          >
            <Terminal className="w-4 h-4" />
            <span>Open Authenticated Workspace</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
          <a
            href="#specs"
            className="px-5 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 border border-white/[0.1] transition-all backdrop-blur-md"
          >
            View Specification Matrix
          </a>
        </div>

        {/* Animated Pipeline Component */}
        <div id="pipeline" className="mt-14">
          <LandingPipeline />
        </div>
      </section>

      {/* 3. The "Source of Truth" Principle Statement */}
      <section id="principle" className="py-16 border-y border-white/[0.07] bg-[#0B101B]/70 my-14 backdrop-blur-xl relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <span className="text-[11px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
            Core Architectural Invariant
          </span>
          <blockquote className="text-2xl sm:text-3xl font-semibold text-white tracking-tight leading-snug">
            &ldquo;Code is the only invariant. AI commentary without exact AST line citations
            is opinion, not engineering intelligence.&rdquo;
          </blockquote>
          <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
            RepoMind verifies every cited slice against active repository trees before tokens
            reach the client. If a line range cannot be proven from source buffers, it is
            discarded.
          </p>
        </div>
      </section>

      {/* 4. Spec-Sheet Feature Grid */}
      <section id="specs" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto relative z-10">
        <div className="mb-10 text-center">
          <span className="text-[11px] font-mono text-indigo-400 font-bold tracking-wider uppercase">
            Technical Architecture
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-1.5">
            Engine Capabilities &amp; Invariants
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
            Deterministic systems designed to parse, index, and query enterprise repositories.
          </p>
        </div>

        {/* Spec Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SPEC_SHEET_ROWS.map((row, idx) => {
            const Icon = row.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#0D1424]/80 border border-white/[0.08] hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition-all group backdrop-blur-md"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {row.label}
                    </h3>
                    <span className="text-[10px] font-mono text-cyan-400 font-semibold tracking-wide">
                      {row.tag}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {row.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Framed Workspace Showcase Section */}
      <section id="showcase" className="py-16 px-4 sm:px-6 max-w-5xl mx-auto my-6 relative z-10">
        <div className="text-center mb-10">
          <span className="text-[11px] font-mono text-cyan-400 font-bold tracking-wider uppercase">
            Live Workspace Preview
          </span>
          <h2 className="text-3xl font-bold tracking-tight text-white mt-1.5">
            Integrated Engineering Command Center
          </h2>
          <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
            Streaming RAG chat with inline interactive citation pills and synced Monaco code viewer.
          </p>
        </div>

        {/* Framed Browser Chrome Window */}
        <div className="rounded-3xl border border-white/[0.12] bg-[#0A0E1A]/90 shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Chrome Header */}
          <div className="h-10 px-4 bg-[#0D1424] border-b border-white/[0.08] flex items-center justify-between text-xs text-slate-500 select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-300 bg-[#070A11] px-3.5 py-0.5 rounded-full border border-white/[0.08]">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>https://repomind.internal/workspace/TechOrAlfaiz/Github-Explorer</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Indexed &bull; 43 Chunks</span>
          </div>

          {/* Interior Product Layout Preview */}
          <div className="h-[380px] flex overflow-hidden text-xs font-sans">
            {/* Sidebar Mock */}
            <div className="w-[190px] bg-[#090D17] border-r border-white/[0.07] p-3 flex flex-col gap-2 shrink-0">
              <div className="px-3 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-[11px] font-semibold text-white flex items-center gap-2">
                <span className="text-indigo-400 font-bold">+</span> New Query
              </div>
              <div className="mt-3 text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider">Recent Threads</div>
              <div className="p-2 rounded-lg bg-white/[0.06] text-[11px] text-white border border-indigo-500/30 font-medium truncate">
                ErrorMessage component
              </div>
              <div className="p-2 rounded-lg text-[11px] text-slate-400 hover:bg-white/[0.03] truncate">
                AST Tree-sitter bounds
              </div>
              <div className="p-2 rounded-lg text-[11px] text-slate-400 hover:bg-white/[0.03] truncate">
                BM25 hybrid scoring
              </div>
            </div>

            {/* Chat Pane Mock */}
            <div className="flex-1 bg-[#080C14] p-4 flex flex-col justify-between overflow-hidden">
              <div className="space-y-3">
                <div className="self-end bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-2xl rounded-tr-sm p-3 max-w-sm ml-auto text-[11px] text-white">
                  Where is ErrorMessage component defined?
                </div>
                <div className="bg-[#0D1424] border border-white/[0.08] rounded-2xl p-3.5 text-[11px] text-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
                    <Sparkles className="w-3 h-3" />
                    <span>Grounded AST Citation</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    In <code className="text-white bg-white/[0.06] px-1.5 py-0.5 rounded font-mono">src/components/ErrorMessage.jsx</code> (lines 1–3), the symbol <code className="text-cyan-300">ErrorMessage</code> implements this logic.
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-mono bg-cyan-500/15 text-cyan-300 px-2.5 py-1 rounded-full border border-cyan-500/30">
                    <FileCode className="w-3 h-3" />
                    <span>[CTX-1] src/components/ErrorMessage.jsx:1-3</span>
                  </div>
                </div>
              </div>
              <div className="h-9 rounded-xl bg-[#0D1424] border border-white/[0.1] px-3.5 flex items-center text-slate-500 text-[11px]">
                Ask about this repository...
              </div>
            </div>

            {/* Code Viewer Panel Mock */}
            <div className="w-[300px] bg-[#070A11] border-l border-white/[0.07] p-3 font-mono text-[10px] hidden md:block">
              <div className="text-[10px] text-slate-400 mb-2.5 flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                <span className="font-semibold text-slate-200">ErrorMessage.jsx</span>
                <span className="text-emerald-400 font-semibold">AST Verified</span>
              </div>
              <div className="space-y-1 text-slate-300">
                <div className="bg-gradient-to-r from-indigo-500/25 via-cyan-500/15 to-transparent border-l-2 border-cyan-400 pl-2 text-white py-0.5">
                  1  const ErrorMessage = (&#123; message &#125;) =&gt; !message ? null : (
                </div>
                <div className="bg-gradient-to-r from-indigo-500/25 via-cyan-500/15 to-transparent border-l-2 border-cyan-400 pl-2 text-white py-0.5">
                  2    &lt;div className="text-red-200"&gt;&#123;message&#125;&lt;/div&gt;
                </div>
                <div className="bg-gradient-to-r from-indigo-500/25 via-cyan-500/15 to-transparent border-l-2 border-cyan-400 pl-2 text-white py-0.5">
                  3  );
                </div>
                <div className="text-slate-600 pl-2">4</div>
                <div className="text-slate-400 pl-2">5  export default ErrorMessage;</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Technology Stack Chips */}
      <section className="py-12 border-t border-white/[0.07] bg-[#080C14] text-center relative z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
          <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-widest">
            Production Engineering Stack
          </span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {TECH_STACK_CHIPS.map((tech) => (
              <span
                key={tech}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs font-mono text-slate-300 hover:text-white hover:border-indigo-500/40 transition-all shadow-xs"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-white/[0.07] py-8 text-center text-xs text-slate-500 font-mono">
        <div className="flex items-center justify-center gap-2 flex-wrap px-4">
          <span>RepoMind AI Engineering Intelligence &bull; 2026</span>
          <span>&bull;</span>
          <span className="inline-flex items-center gap-1.5 text-slate-300 font-sans">
            Created with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" /> by{" "}
            <a
              href="https://github.com/TechOrAlfaiz"
              target="_blank"
              rel="noreferrer"
              className="text-white hover:text-cyan-400 font-semibold transition underline decoration-indigo-500/50 hover:decoration-cyan-400"
            >
              TechOrAlfaiz (Alfaiz)
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
};
