import React, { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Terminal, ArrowRight, Menu, X, Github, ExternalLink, ChevronRight, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const PublicLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const navLinks = [
    { name: "Features", path: "/features" },
    { name: "How It Works", path: "/how-it-works" },
    { name: "Use Cases", path: "/use-cases" },
    { name: "FAQ", path: "/faq" },
  ];

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans relative selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Ambient Top Glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-indigo-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Public Navbar */}
      <header
        className={`sticky top-0 z-50 transition-all duration-200 ${
          isScrolled
            ? "bg-[#080C14]/85 backdrop-blur-xl border-b border-white/[0.08] shadow-xl shadow-black/50"
            : "bg-[#080C14]/40 backdrop-blur-md border-b border-white/[0.04]"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-400 p-[1px] shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition">
              <div className="w-full h-full bg-[#080C14] rounded-[7px] flex items-center justify-center">
                <Terminal className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-base text-white">RepoMind</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-white/[0.02] border border-white/[0.06] rounded-full px-3 py-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`text-xs font-medium px-3 py-1.5 rounded-full transition-all ${
                    isActive
                      ? "text-white bg-white/[0.08]"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Right CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <Link
                to="/app/dashboard"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-500/20 cursor-pointer btn-shimmer"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition rounded-lg hover:bg-white/[0.04]"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-medium text-xs flex items-center gap-2 transition-all shadow-md shadow-indigo-500/25 cursor-pointer btn-shimmer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#080C14]/95 border-b border-white/[0.08] backdrop-blur-2xl px-6 py-6 flex flex-col gap-4 animate-in slide-in-from-top-4 duration-200">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-sm font-semibold text-slate-300 hover:text-white py-1 flex items-center justify-between"
              >
                <span>{link.name}</span>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </Link>
            ))}
            <div className="border-t border-white/[0.08] pt-4 flex flex-col gap-3">
              {isAuthenticated ? (
                <Link
                  to="/app/dashboard"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-center text-white font-semibold text-xs shadow-lg shadow-indigo-500/25"
                >
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="w-full py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-center text-slate-200 font-semibold text-xs"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-center text-white font-semibold text-xs shadow-lg shadow-indigo-500/25"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-white/[0.08] bg-[#05080F] text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px]">
                  <div className="w-full h-full bg-[#080C14] rounded-[11px] flex items-center justify-center">
                    <Terminal className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
                <span className="font-bold text-white text-base">RepoMind</span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                AI Engineering Intelligence for your codebase. Connect your GitHub repositories, understand complete architectural workflows, and interact with deterministic source-code evidence.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <a
                  href="https://github.com/TechOrAlfaiz"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition"
                  aria-label="GitHub"
                >
                  <Github className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Product Column */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-200 font-bold">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/features" className="hover:text-white transition">Features</Link></li>
                <li><Link to="/features#chat" className="hover:text-white transition">AI Code Chat</Link></li>
                <li><Link to="/features#explorer" className="hover:text-white transition">Code Explorer</Link></li>
                <li><Link to="/features#architecture" className="hover:text-white transition">Architecture</Link></li>
                <li><Link to="/features#bugs" className="hover:text-white transition">Bug Investigator</Link></li>
                <li><Link to="/features#pr" className="hover:text-white transition">PR Intelligence</Link></li>
              </ul>
            </div>

            {/* Resources Column */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-200 font-bold">Resources</h4>
              <ul className="space-y-2">
                <li><Link to="/how-it-works" className="hover:text-white transition">How It Works</Link></li>
                <li><Link to="/use-cases" className="hover:text-white transition">Use Cases</Link></li>
                <li><Link to="/faq" className="hover:text-white transition">FAQ</Link></li>
                <li><a href="https://github.com/TechOrAlfaiz/repomind" target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-1">GitHub Repo <ExternalLink className="w-3 h-3" /></a></li>
              </ul>
            </div>

            {/* Legal & Security Column */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-mono uppercase tracking-wider text-slate-200 font-bold">Security & Legal</h4>
              <ul className="space-y-2">
                <li><span className="text-slate-500">Zero Hallucination Fencing</span></li>
                <li><span className="text-slate-500">Tenant Isolation</span></li>
                <li><span className="text-slate-500">Tree-sitter AST Privacy</span></li>
                <li><span className="text-slate-500">Cryptographic Audit Logs</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/[0.08] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div className="flex items-center flex-wrap gap-2 text-center sm:text-left">
              <span>&copy; 2026 RepoMind AI Engineering Intelligence.</span>
              <span className="hidden sm:inline">&bull;</span>
              <span className="inline-flex items-center gap-1.5 text-slate-300 font-medium">
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
            <div className="flex items-center gap-6">
              <span>Deterministic Synthesizer</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>Qdrant L2 Cosine</span>
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              <span>Production Grade</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
