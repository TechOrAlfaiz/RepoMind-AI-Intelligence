import React from "react";
import { Link, Outlet } from "react-router-dom";
import { Terminal, ArrowLeft, Heart, ShieldCheck, Lock, Sparkles } from "lucide-react";

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Top Radial Aura */}
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[450px] bg-gradient-to-b from-indigo-600/15 via-cyan-500/10 to-transparent blur-[140px] rounded-full" />
        {/* Bottom Ambient Glows */}
        <div className="absolute -bottom-40 -left-20 w-[450px] h-[450px] bg-indigo-600/10 blur-[130px] rounded-full" />
        <div className="absolute -bottom-40 -right-20 w-[450px] h-[450px] bg-cyan-600/10 blur-[130px] rounded-full" />
        {/* Cyber Matrix Dot Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />
      </div>

      {/* Top Navigation Bar */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between relative z-20">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition">
            <div className="w-full h-full bg-[#080C14] rounded-[11px] flex items-center justify-center">
              <Terminal className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-base text-white">RepoMind</span>
          </div>
        </Link>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-xs font-medium text-slate-300 hover:text-white transition shadow-sm"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to website</span>
        </Link>
      </header>

      {/* Main Center Auth Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-4 sm:py-6 relative z-10">
        <div className="w-full max-w-md mx-auto">
          {/* Glassmorphic Auth Card */}
          <div className="relative rounded-3xl border border-white/[0.1] bg-[#0B101D]/90 backdrop-blur-2xl p-6 sm:p-7 shadow-2xl shadow-black/80">
            {/* Top Card Gradient Highlight Beam */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            <Outlet />
          </div>
        </div>
      </main>

      {/* Bottom Global Security & Credit Footer */}
      <footer className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[11px] text-slate-500 font-mono relative z-20 border-t border-white/[0.04]">
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Zero Source Retention
          </span>
          <span className="text-slate-700">&bull;</span>
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            AST Fenced Sandbox
          </span>
          <span className="text-slate-700 hidden sm:inline">&bull;</span>
          <span className="flex items-center gap-1.5 hidden sm:inline-flex">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Production Grade
          </span>
        </div>

        <div className="inline-flex items-center gap-1.5 text-slate-400 font-sans">
          <span>Created with</span>
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />
          <span>by</span>
          <a
            href="https://github.com/TechOrAlfaiz"
            target="_blank"
            rel="noreferrer"
            className="text-slate-200 hover:text-cyan-400 font-semibold transition underline decoration-indigo-500/50 hover:decoration-cyan-400"
          >
            TechOrAlfaiz (Alfaiz)
          </a>
        </div>
      </footer>
    </div>
  );
};
