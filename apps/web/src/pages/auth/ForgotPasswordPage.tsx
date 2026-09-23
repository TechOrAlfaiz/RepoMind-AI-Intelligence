import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, CheckCircle2, ArrowRight } from "lucide-react";

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Reset your password
        </h1>
        <p className="text-xs text-slate-400">
          Enter the email address associated with your account and we'll send you recovery instructions.
        </p>
      </div>

      {submitted ? (
        <div className="p-4 rounded-xl bg-[#0D1424] border border-[#1F293D] space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>Reset Link Sent</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            If an account exists for <span className="font-mono text-white">{email}</span>, you will receive password reset instructions shortly.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-400 hover:text-cyan-300 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to login</span>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">Account Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 bg-[#0D1424] border border-[#1F293D] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-sans"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/25 cursor-pointer btn-shimmer group"
          >
            <span>Send Recovery Instructions</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="text-center pt-1">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </form>
      )}
    </div>
  );
};
