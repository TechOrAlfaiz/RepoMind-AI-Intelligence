import React from "react";
import { Link } from "react-router-dom";
import { Users, Bug, GitPullRequest, History, ArrowRight, CheckCircle2 } from "lucide-react";

export const UseCasesPage: React.FC = () => {
  const useCases = [
    {
      title: "New Developer Onboarding",
      category: "TEAM VELOCITY",
      icon: Users,
      problem: "New hires take weeks to navigate unfamiliar architecture, discover undocumented conventions, and identify where key business logic lives.",
      solution: "RepoMind provides instant conversational answers with line-level source code citations and automated architectural playbooks.",
      metrics: "Reduces initial commit ramp-up time from weeks to days.",
    },
    {
      title: "Cross-File Bug Investigations",
      category: "INCIDENT RESPONSE",
      icon: Bug,
      problem: "Production errors often cascade through multiple services, middleware layers, and utility wrappers without an obvious root culprit.",
      solution: "Paste stack traces or describe failing edge cases. RepoMind traces complete call-chains and highlights suspected functions across files.",
      metrics: "Decreases mean-time-to-resolution (MTTR) by tracing root causes in minutes.",
    },
    {
      title: "Pre-Merge Pull Request Reviews",
      category: "CODE QUALITY",
      icon: GitPullRequest,
      problem: "Reviewing large pull requests manually can cause developers to miss unintended side effects on external consumers and circular dependencies.",
      solution: "RepoMind analyzes git diffs against the entire repository graph to flag architectural hazards, untested paths, and breaking changes.",
      metrics: "Prevents regression bugs from reaching main branches.",
    },
    {
      title: "Legacy Codebase Modernization",
      category: "TECHNICAL DEBT",
      icon: History,
      problem: "Old repositories have missing documentation and original authors who have long departed, making refactoring high-risk.",
      solution: "Ask questions about historic design choices, query specific commit SHAs using Repo Time Machine, and trace deprecated APIs safely.",
      metrics: "De-risks complex framework upgrades and architectural migrations.",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20 space-y-16">
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 uppercase">
          Proven Engineering Workflows
        </span>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
          Engineered for Real-World Problems
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          See how software engineering teams leverage RepoMind's grounded code intelligence across the entire software development lifecycle.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {useCases.map((uc) => {
          const Icon = uc.icon;
          return (
            <div
              key={uc.title}
              className="p-8 rounded-2xl bg-white/[0.02] border border-white/[0.07] flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white/[0.04] text-slate-400 border border-white/[0.08]">
                    {uc.category}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{uc.title}</h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold uppercase font-mono text-[10px]">The Challenge:</span>
                    <p className="text-slate-400 mt-1 leading-relaxed">{uc.problem}</p>
                  </div>
                  <div>
                    <span className="text-cyan-400 font-semibold uppercase font-mono text-[10px]">The RepoMind Solution:</span>
                    <p className="text-slate-300 mt-1 leading-relaxed">{uc.solution}</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.04] text-[11px] text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{uc.metrics}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-8 rounded-2xl bg-[#0B101E] border border-white/[0.08] text-center space-y-4">
        <h3 className="text-xl font-bold text-white">Supercharge your team's code understanding</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Deploy RepoMind today to transform how your engineers interact with your codebase.
        </p>
        <div className="pt-2">
          <Link
            to="/app/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 transition"
          >
            <span>Launch App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
