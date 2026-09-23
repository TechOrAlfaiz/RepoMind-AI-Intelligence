import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Github,
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  AlertCircle,
  Eye,
  EyeOff,
  Terminal,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const LoginPage: React.FC = () => {
  const { devLogin, loginWithGitHub, isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectUrl = searchParams.get("redirect") || "/app/dashboard";

  // If already authenticated, redirect immediately
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectUrl, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectUrl]);

  // Capture OAuth error or message query params from callback redirect
  React.useEffect(() => {
    const oauthError = searchParams.get("error") || searchParams.get("message");
    if (oauthError) {
      setError(oauthError);
    }
  }, [searchParams]);

  const handleDevLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await devLogin();
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      setError("Failed to initialize session. Please check API server status.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await devLogin(); // In local development, log in as verified session
      navigate(redirectUrl, { replace: true });
    } catch (err: any) {
      setError("Authentication failed. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="text-center space-y-1.5">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 mx-auto">
          <div className="w-full h-full bg-[#080C14] rounded-[11px] flex items-center justify-center">
            <Terminal className="w-4 h-4 text-cyan-400" />
          </div>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
          Sign in to RepoMind
        </h1>
        <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
          Access your indexed repositories and AI engineering intelligence workspace.
        </p>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary GitHub OAuth Button */}
      <button
        type="button"
        onClick={loginWithGitHub}
        className="w-full py-2.5 px-4 rounded-xl bg-[#0D1424] hover:bg-[#131D31] border border-[#1F293D] hover:border-cyan-500/50 text-white font-semibold text-xs flex items-center justify-between transition-all duration-200 cursor-pointer shadow-sm group"
      >
        <div className="flex items-center gap-2.5">
          <Github className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" />
          <span>Continue with GitHub</span>
        </div>
        <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-400 group-hover:text-slate-200">
          OAuth
        </kbd>
      </button>

      {/* 1-Click Fast Track Developer Demo Card */}
      <div className="p-3 rounded-2xl bg-gradient-to-b from-[#0E1528] to-[#0A0F1D] border border-indigo-500/30 hover:border-indigo-500/50 space-y-2 shadow-lg shadow-indigo-500/5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Instant Demo Access</span>
          </div>
          <span className="text-[9px] font-mono uppercase bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 font-semibold">
            1-Click Dev
          </span>
        </div>
        <p className="text-[11px] text-slate-400 leading-snug">
          Instantly launch a pre-authenticated session with sample repository and live AST graphs.
        </p>
        <button
          type="button"
          onClick={handleDevLogin}
          disabled={isLoading}
          className="w-full py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50 btn-shimmer group"
        >
          <span>{isLoading ? "Authenticating..." : "Launch Demo Session"}</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Perfectly Centered Hairline Divider */}
      <div className="flex items-center gap-3 py-0.5">
        <div className="flex-1 h-[1px] bg-white/[0.08]" />
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest shrink-0 select-none">
          or email sign in
        </span>
        <div className="flex-1 h-[1px] bg-white/[0.08]" />
      </div>

      {/* Email & Password Form */}
      <form onSubmit={handleEmailSubmit} className="space-y-3.5">
        {/* Work Email */}
        <div className="space-y-1">
          <label className="block text-xs font-semibold text-slate-300">
            Work Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="developer@company.com"
              className="w-full pl-10 pr-3.5 py-2 bg-[#080C14] border border-[#1F293D] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/20 transition font-sans"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-300">
              Password
            </label>
            <Link
              to="/forgot-password"
              className="text-[11px] text-indigo-400 hover:text-cyan-300 transition"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full pl-10 pr-10 py-2 bg-[#080C14] border border-[#1F293D] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/70 focus:ring-2 focus:ring-cyan-500/20 transition font-sans"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center justify-between pt-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-[#1F293D] bg-[#080C14] text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span className="text-[11px] text-slate-400">Remember session for 30 days</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl bg-[#0E1524] hover:bg-[#141E34] border border-[#1F293D] hover:border-slate-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          Sign In with Email
        </button>
      </form>

      {/* Footer Switcher */}
      <div className="text-center text-xs text-slate-400 pt-0.5">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="text-cyan-400 font-semibold hover:text-cyan-300 transition underline decoration-cyan-500/30 hover:decoration-cyan-400"
        >
          Sign up free
        </Link>
      </div>
    </div>
  );
};
