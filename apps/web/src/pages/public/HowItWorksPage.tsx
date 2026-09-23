import React from "react";
import { Link } from "react-router-dom";
import { FolderGit2, Code2, Cpu, ShieldCheck, ArrowRight } from "lucide-react";

export const HowItWorksPage: React.FC = () => {
  const steps = [
    {
      num: "01",
      title: "Repository Connection & Tree Discovery",
      desc: "Connect your GitHub account or enter any public/private repository. RepoMind reads repository metadata, inspects the default branch, and discovers all supported source files across TypeScript, JavaScript, Python, Go, and Rust.",
      badge: "GitHub API & Webhooks",
      icon: FolderGit2,
    },
    {
      num: "02",
      title: "Language-Native Tree-sitter AST Slicing",
      desc: "Instead of splitting files by arbitrary character or line counts, RepoMind passes code through language-specific AST grammars. It slices files at syntactic boundaries—function declarations, class definitions, and exported interfaces—attaching contextual path headers to every chunk.",
      badge: "Tree-sitter Parser",
      icon: Code2,
    },
    {
      num: "03",
      title: "Dual Vector & BM25 Reciprocal Rank Fusion",
      desc: "Chunks are embedded into high-dimensional vectors and simultaneously indexed into a sparse BM25 inverted index. During query execution, Reciprocal Rank Fusion (RRF k=60) merges exact identifier lookups with semantic conceptual queries.",
      badge: "Qdrant + BM25",
      icon: Cpu,
    },
    {
      num: "04",
      title: "Post-Generation Deterministic Citation Validation",
      desc: "When the LLM generates a response citing files and line ranges, RepoMind's post-gen validator verifies each reference against the repository's active Git tree. Any hallucinated file path or invalid line bound is automatically suppressed.",
      badge: "Zero Hallucination",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
          Under The Hood
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          How RepoMind Understands Code
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          A transparent look into the deterministic AST parsing, dual-stage RAG, and citation verification pipeline.
        </p>
      </div>

      <div className="space-y-8">
        {steps.map((s) => (
          <div
            key={s.num}
            className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex flex-col md:flex-row gap-6 items-start"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono font-bold text-lg flex-shrink-0">
              {s.num}
            </div>
            <div className="space-y-3 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-bold text-white">{s.title}</h3>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/[0.04] text-cyan-300 border border-white/[0.08]">
                  {s.badge}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-8 rounded-2xl bg-[#0B101E] border border-white/[0.08] text-center space-y-4">
        <h3 className="text-xl font-bold text-white">Ready to test with your own codebase?</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Start exploring your repository in under two minutes with automated AST chunking.
        </p>
        <div className="pt-2">
          <Link
            to="/app/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition"
          >
            <span>Open Application</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
