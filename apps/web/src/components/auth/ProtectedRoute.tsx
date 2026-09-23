import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Terminal } from "lucide-react";

export const ProtectedRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1.5px] shadow-xl shadow-indigo-500/25 animate-pulse">
          <div className="w-full h-full bg-[#080C14] rounded-[14px] flex items-center justify-center">
            <Terminal className="w-6 h-6 text-indigo-400 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-sm font-semibold text-white tracking-wide">Authenticating RepoMind Session</span>
          <span className="text-xs text-slate-400 font-mono">Verifying cryptographic credentials...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};
