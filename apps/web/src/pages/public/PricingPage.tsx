import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export const PricingPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
          Access & Licensing
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Built for developers and engineering teams.
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          RepoMind is engineered with an open, developer-first architecture. Index unlimited repositories locally or deploy in private enterprise infrastructure.
        </p>
      </div>

      <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-[#0E1524] to-[#070A14] border border-white/[0.1] shadow-2xl space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.08]">
          <div>
            <h3 className="text-2xl font-bold text-white">Developer Edition</h3>
            <p className="text-xs text-slate-400 mt-1">
              Full-featured code intelligence suite with AST chunking, dual-stage RAG, and Monaco editor integration.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-3xl font-extrabold text-white font-mono">Free</span>
            <span className="text-xs text-slate-400 block font-mono">For open-source & individual developers</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Unlimited public and private repository connections</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Language-native Tree-sitter AST semantic parsing</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Hybrid RRF retrieval (Qdrant Dense Vector + BM25)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Deterministic post-generation citation validation</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Interactive Code Explorer with deep-linked line ranges</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Automated architecture graphs & bug root-cause investigation</span>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 justify-between border-t border-white/[0.08]">
          <span className="text-xs text-slate-400 font-mono">
            No credit card required. Get started immediately.
          </span>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Link
              to="/signup"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-indigo-500/25"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
