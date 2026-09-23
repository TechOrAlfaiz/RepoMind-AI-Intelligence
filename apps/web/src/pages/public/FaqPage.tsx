import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, ArrowRight } from "lucide-react";

export const FaqPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "What is RepoMind?",
      a: "RepoMind is an AI Engineering Intelligence platform that connects to GitHub repositories, understands codebases using Tree-sitter AST parsing and hybrid RAG, and helps developers explore, analyze, debug, and query their architecture with verifiable source-code citations.",
    },
    {
      q: "How does RepoMind understand my code?",
      a: "RepoMind parses code through language-specific AST grammars (Tree-sitter) into syntactic units (functions, classes, interfaces). Each unit is embedded into vectors and indexed with BM25 keywords. During queries, Reciprocal Rank Fusion identifies the exact relevant context, and answers are backed by verified line-number citations.",
    },
    {
      q: "Does RepoMind support private repositories?",
      a: "Yes. When connecting via GitHub OAuth or a fine-grained Personal Access Token, RepoMind securely clones and indexes both private and public repositories within your organization's encrypted tenant fence.",
    },
    {
      q: "How does GitHub integration work?",
      a: "RepoMind integrates via the GitHub REST API and optional repository Webhooks. Webhooks allow RepoMind to receive push notifications for commits and PRs, triggering differential incremental ingestion so you never have to manually re-index.",
    },
    {
      q: "Does RepoMind modify my code?",
      a: "No. RepoMind is strictly a read-only analysis and intelligence engine. It builds vector indexes, architecture graphs, and bug diagnostics without creating commits or changing code files.",
    },
    {
      q: "What programming languages are supported for AST parsing?",
      a: "RepoMind supports TypeScript, JavaScript, JSX/TSX, Python, Go, Rust, and JSON out of the box, with fallback chunking for Markdown, YAML, and Dockerfiles.",
    },
    {
      q: "How does AI source citation work?",
      a: "Every response token is generated using untrusted context blocks [CTX-n]. Once generation completes, RepoMind's Post-Gen Citation Validator cross-checks every cited line range and file path against the real Git tree. Hallucinated citations are suppressed with zero tolerance.",
    },
    {
      q: "How is repository data handled and isolated?",
      a: "Data isolation is enforced at the organization boundary. Chunk records, vector store collections, conversation threads, and telemetry are isolated by cryptographic tenant IDs.",
    },
    {
      q: "What happens when my repository changes?",
      a: "Differential ingestion kicks in. Webhook events notify BullMQ workers to parse only modified files in the commit diff, re-chunking and re-embedding them in sub-second background jobs.",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 uppercase">
          Everything You Need To Know
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Frequently Asked Questions
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Technical explanations of RepoMind's architecture, security boundaries, and retrieval capabilities.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full px-6 py-4 text-left flex items-center justify-between text-sm font-semibold text-slate-200 hover:text-white transition cursor-pointer"
              >
                <span>{faq.q}</span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 flex-shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-6 pb-5 text-xs text-slate-400 leading-relaxed border-t border-white/[0.04] pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-8 rounded-2xl bg-[#0B101E] border border-white/[0.08] text-center space-y-4">
        <h3 className="text-xl font-bold text-white">Still have questions?</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Explore our codebase directly or launch the application to test RepoMind live.
        </p>
        <div className="pt-2">
          <Link
            to="/app/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition"
          >
            <span>Open Application</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
