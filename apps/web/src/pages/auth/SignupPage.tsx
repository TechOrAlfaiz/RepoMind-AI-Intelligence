import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Github, ArrowRight, Lock, Mail, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const SignupPage: React.FC = () => {
  const { devLogin, loginWithGitHub, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await devLogin();
      navigate("/app/dashboard", { replace: true });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Create your account
        </h1>
        <p className="text-xs text-slate-400">
          Get started with RepoMind to index your repositories and unlock deep codebase intelligence.
        </p>
      </div>

      {/* GitHub Fast Registration */}
      <button
        type="button"
        onClick={loginWithGitHub}
        className="w-full py-2.5 px-4 rounded-xl bg-[#0D1424] hover:bg-[#111A30] border border-[#1F293D] hover:border-indigo-500/40 text-slate-200 hover:text-white font-semibold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer shadow-sm group"
      >
        <Github className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
        <span>Sign up with GitHub</span>
      </button>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-white/[0.08] w-full" />
        <span className="bg-[#080C14] px-3 text-[11px] font-mono text-slate-500 uppercase tracking-wider relative">
          Or register with email
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Full Name</label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 bg-[#0D1424] border border-[#1F293D] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-sans"
              placeholder="Alex Rivers"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Work Email</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 bg-[#0D1424] border border-[#1F293D] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-sans"
              placeholder="alex@company.com"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-300">Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-9 pr-3 py-2 bg-[#0D1424] border border-[#1F293D] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-sans"
              placeholder="At least 8 characters"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/25 cursor-pointer disabled:opacity-50 btn-shimmer group"
        >
          <span>{isLoading ? "Creating Account..." : "Create Free Account"}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </form>

      <div className="text-center text-xs text-slate-400 pt-1">
        Already have an account?{" "}
        <Link to="/login" className="text-indigo-400 font-semibold hover:text-cyan-300 transition">
          Sign in
        </Link>
      </div>
    </div>
  );
};
