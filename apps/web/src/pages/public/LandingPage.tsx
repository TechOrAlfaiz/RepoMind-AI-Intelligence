import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Terminal,
  ShieldCheck,
  Sparkles,
  FolderGit2,
  Network,
  AlertTriangle,
  ChevronDown,
  Code2,
  Zap,
  GitBranch,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const LandingPage: React.FC = () => {
  const { isAuthenticated, loginWithGitHub } = useAuth();

  // Active tab in unified Hero IDE Terminal
  const [activeTab, setActiveTab] = useState<number>(0);


  // Active node in Topology Bento Card
  const [activeTopologyNode, setActiveTopologyNode] = useState<string>("app");

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const heroTabs = [
    {
      label: "auth.service.ts",
      title: "Authentication Handler",
      path: "src/auth/auth.service.ts",
      lines: "L42–L67",
      ctx: "CTX-1",
      query: "Where is authentication implemented?",
      answer:
        "Authentication is handled by auth.service.ts using JWT verification and session storage. Protected endpoints pass through the jwt.middleware.ts guard.",
      codeSnippet: [
        { num: 42, text: "export class AuthService {", hl: false },
        { num: 43, text: "  constructor(private readonly jwtService: JwtService) {}", hl: false },
        { num: 44, text: "  async validateToken(bearerToken: string): Promise<SessionUser> {", hl: true },
        { num: 45, text: "    const decoded = this.jwtService.verify(bearerToken);", hl: true },
        { num: 46, text: "    return this.userRepository.findById(decoded.sub);", hl: true },
        { num: 47, text: "  }", hl: false },
        { num: 48, text: "}", hl: false },
      ],
      metrics: "AST Match: 0.942 • 2 Inbound References",
    },
    {
      label: "jwt.middleware.ts",
      title: "Route Guard Guard",
      path: "src/middleware/jwt.middleware.ts",
      lines: "L12–L40",
      ctx: "CTX-2",
      query: "How are protected endpoints secured?",
      answer:
        "All incoming protected API routes pass through requireAuth() inside jwt.middleware.ts, validating the Bearer token against the AuthService session store.",
      codeSnippet: [
        { num: 12, text: "export const requireAuth = (req: Request, res: Response, next: NextFunction) => {", hl: false },
        { num: 13, text: "  const header = req.headers.authorization;", hl: true },
        { num: 14, text: "  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });", hl: true },
        { num: 15, text: "  req.user = await authService.validateToken(header.slice(7));", hl: true },
        { num: 16, text: "  next();", hl: false },
        { num: 17, text: "};", hl: false },
      ],
      metrics: "AST Match: 0.918 • 14 Inbound Routes",
    },
    {
      label: "billing.service.ts",
      title: "Subscription Lifecycle",
      path: "src/services/billing.service.ts",
      lines: "L110–L135",
      ctx: "CTX-3",
      query: "Where is Stripe subscription billing handled?",
      answer:
        "Subscription lifecycles and invoice webhook events are processed by billing.service.ts and verified against the Stripe signing secret in webhook.controller.ts.",
      codeSnippet: [
        { num: 110, text: "export async function handleSubscriptionUpdated(", hl: false },
        { num: 111, text: "  event: Stripe.CustomerSubscriptionUpdatedEvent", hl: false },
        { num: 112, text: "): Promise<void> {", hl: false },
        { num: 113, text: "  const org = await getOrgByCustomerId(event.customer);", hl: true },
        { num: 114, text: "  await updateTierLimits(org.id, event.items.data[0].plan);", hl: true },
        { num: 115, text: "}", hl: false },
      ],
      metrics: "AST Match: 0.931 • 4 Webhook Handlers",
    },
  ];

  const currentHero = heroTabs[activeTab];

  const pipelineSteps = [
    {
      step: "01",
      title: "Connect GitHub",
      desc: "Authenticate via OAuth or fine-grained PAT. RepoMind clones your branch in a cryptographically isolated, read-only sandbox.",
      stat: "Read-Only Sandbox",
    },
    {
      step: "02",
      title: "AST-Aware Parsing",
      desc: "Tree-sitter parses complete semantic boundaries—functions, classes, interfaces, and types—preventing lost context.",
      stat: "Zero Context Bleed",
    },
    {
      step: "03",
      title: "Hybrid RRF Retrieval",
      desc: "Reciprocal Rank Fusion (k=60) merges high-dimensional dense vector similarity with sparse BM25 exact keyword matching.",
      stat: "Dense + BM25 Scoring",
    },
    {
      step: "04",
      title: "Citation Fencing",
      desc: "Post-Gen Citation Validator strictly cross-verifies every cited file, symbol, and line range against the live Git tree.",
      stat: "Zero Hallucination",
    },
  ];

  const topologyNodes: Record<
    string,
    { label: string; type: string; deps: string[]; color: string; desc: string }
  > = {
    app: {
      label: "AppShell.tsx",
      type: "UI Workstation",
      deps: ["ChatPane.tsx", "GraphCanvas.tsx", "CodeViewer.tsx"],
      color: "border-indigo-500/50 bg-indigo-500/10 text-indigo-300",
      desc: "Root orchestrator synchronizing 3-pane layout, selection state, and hotkeys.",
    },
    chat: {
      label: "ChatPane.tsx",
      type: "Grounded Chat",
      deps: ["RAGService", "CitationValidator"],
      color: "border-cyan-500/50 bg-cyan-500/10 text-cyan-300",
      desc: "SSE streaming code intelligence interface with line-level AST citations.",
    },
    canvas: {
      label: "GraphCanvas.tsx",
      type: "Interactive Graph",
      deps: ["DependencyIndex", "BlastRadiusEngine"],
      color: "border-purple-500/50 bg-purple-500/10 text-purple-300",
      desc: "Hardware-accelerated SVG dependency canvas with timeline scrubber.",
    },
    rag: {
      label: "RAGService",
      type: "Engine Core",
      deps: ["TreeSitterAST", "VectorIndex", "BM25Engine"],
      color: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
      desc: "Coordinates Reciprocal Rank Fusion, vector similarity, and symbol tokenization.",
    },
  };

  const faqs = [
    {
      q: "What makes RepoMind different from generic AI chat tools?",
      a: "Generic tools dump unstructured text files into LLM prompts, leading to truncated context, hallucinated file paths, and phantom code. RepoMind uses language-native Tree-sitter AST parsing to preserve complete semantic symbol boundaries, blends dense vector search with BM25 keywords via Reciprocal Rank Fusion, and validates every response with a deterministic Post-Gen Citation Validator.",
    },
    {
      q: "Does RepoMind ever modify or write commits to my repository?",
      a: "No. RepoMind operates in a strict read-only sandbox. It parses AST structures, computes embeddings, and maps dependency relationships without altering your commit history or pushing to branches.",
    },
    {
      q: "How does RepoMind keep up when commits and PRs are pushed?",
      a: "RepoMind employs differential incremental ingestion. When webhooks notify RepoMind of a push or pull request, background BullMQ workers inspect git diffs, re-indexing only the modified AST boundaries rather than executing slow full repository re-scans.",
    },
    {
      q: "Can RepoMind handle large monorepos with multiple languages?",
      a: "Yes. RepoMind supports polyglot codebases including TypeScript, JavaScript, Python, Go, and Rust. Its multi-level graph abstraction lets you zoom seamlessly from system architecture down to individual symbol call chains.",
    },
    {
      q: "How is repository security and privacy maintained?",
      a: "All repository data, chunks, and audit logs are fenced inside cryptographically isolated tenant partitions. We enforce strict organization-level access control lists and zero data leakage across workspaces.",
    },
  ];

  return (
    <div className="space-y-24 sm:space-y-36 pb-24 overflow-hidden relative">
      {/* 1. HERO SECTION */}
      <section className="pt-8 sm:pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col items-center text-center space-y-6 max-w-4xl mx-auto">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/25 bg-indigo-500/10 text-xs font-mono text-indigo-300 shadow-sm backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-semibold text-white">RepoMind</span>
            <span className="text-slate-500">•</span>
            <span className="text-cyan-400 font-semibold">AST Grounded Intelligence</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.08]">
            Understand your codebase <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-cyan-300">
              at the speed of thought.
            </span>
          </h1>

          {/* Subhead */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed font-normal">
            Connect your GitHub repository to index AST function boundaries, trace cross-file call chains, and navigate architecture with deterministic line-level citations.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-2 w-full sm:w-auto">
            {isAuthenticated ? (
              <Link
                to="/app/dashboard"
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/25 cursor-pointer btn-shimmer group"
              >
                <span>Open Application Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={loginWithGitHub}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/25 cursor-pointer btn-shimmer group"
                >
                  <FolderGit2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Connect GitHub</span>
                </button>
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0D1424] hover:bg-[#131D31] text-slate-200 hover:text-white font-semibold text-sm border border-[#1F293D] hover:border-indigo-500/40 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Explore Demo</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 2. UNIFIED HERO IDE PRODUCT TERMINAL (Integrated Tabs & Laser Scan) */}
        <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-[#1F293D] bg-[#0A0E1A]/95 backdrop-blur-2xl shadow-2xl overflow-hidden pro-card-hover group">
            {/* Top Unified Terminal & Tab Bar */}
            <div className="px-4 py-2 border-b border-[#1F293D] bg-[#070A14] flex flex-wrap items-center justify-between gap-3">
              {/* Window Dots */}
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-mono text-slate-400 pl-2 hidden sm:inline">
                  repomind-core • main
                </span>
              </div>

              {/* Integrated File Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {heroTabs.map((tab, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveTab(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      activeTab === idx
                        ? "bg-[#0D1424] text-white border border-[#1F293D] shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]"
                    }`}
                  >
                    <Code2
                      className={`w-3.5 h-3.5 ${
                        activeTab === idx ? "text-cyan-400" : "text-slate-500"
                      }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Status Badge */}
              <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>AST Fencing Active</span>
              </div>
            </div>

            {/* Split Screen Preview: Query & Code */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
              {/* Left Side: Question & Grounded Answer */}
              <div className="lg:col-span-6 p-6 border-b lg:border-b-0 lg:border-r border-[#1F293D] flex flex-col justify-between space-y-6 bg-[#080C14]">
                <div className="space-y-4">
                  {/* User Query */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/25 border border-indigo-500/40 flex items-center justify-center text-xs font-bold text-indigo-300 shrink-0">
                      U
                    </div>
                    <div className="bg-[#0D1424] border border-[#1F293D] rounded-xl px-3.5 py-2 text-xs text-slate-200 shadow-sm">
                      {currentHero.query}
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 via-indigo-600 to-cyan-400 p-[1px] shrink-0 shadow-md shadow-indigo-500/25">
                      <div className="w-full h-full bg-[#080C14] rounded-[6px] flex items-center justify-center">
                        <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">
                        {currentHero.answer}
                      </p>

                      {/* Verified Citation Pill */}
                      <div className="p-2.5 rounded-xl bg-[#0D1424] border border-[#1F293D] space-y-1">
                        <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Verified AST Citation</span>
                          <span className="text-cyan-400 font-semibold">{currentHero.ctx}</span>
                        </div>
                        <div className="text-xs font-mono text-indigo-300 flex items-center justify-between">
                          <span className="truncate">{currentHero.path}</span>
                          <span className="text-slate-400 shrink-0 ml-2">{currentHero.lines}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1F293D] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-500 font-mono">{currentHero.metrics}</span>
                  <Link
                    to="/app/architecture"
                    className="font-semibold text-indigo-400 hover:text-cyan-300 flex items-center gap-1 transition"
                  >
                    <span>Inspect Graph</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Right Side: Code Viewer with Laser Scan */}
              <div className="lg:col-span-6 p-6 bg-[#060911] flex flex-col justify-between font-mono text-xs overflow-x-auto relative">
                {/* Laser scan beam */}
                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-laser-scan pointer-events-none" />

                <div className="space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1F293D] text-slate-400 text-[11px]">
                    <span className="text-white font-semibold flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                      {currentHero.path}
                    </span>
                    <span className="text-emerald-400 font-mono">{currentHero.lines}</span>
                  </div>

                  <div className="space-y-1 text-slate-300 leading-relaxed pt-2">
                    {currentHero.codeSnippet.map((line, idx) => (
                      <div
                        key={idx}
                        className={
                          line.hl
                            ? "bg-indigo-500/20 text-indigo-200 px-2 py-0.5 rounded border-l-2 border-indigo-400"
                            : "text-slate-500 hover:text-slate-400"
                        }
                      >
                        <span className="text-slate-600 select-none mr-3">{line.num} |</span>
                        <span>{line.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 text-[11px] text-slate-500 flex items-center justify-between border-t border-[#1F293D]">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Deterministic Git Verification</span>
                  </span>
                  <span className="text-indigo-400 font-mono">AST Tree-sitter: Parsed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CONTINUOUS EXECUTION PIPELINE ("How RepoMind Works") */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-14">
          <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
            Execution Pipeline
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            How RepoMind Works
          </h2>
          <p className="text-sm text-slate-400">
            From raw repository git tree to verifiable engineering intelligence in four deterministic stages.
          </p>
        </div>

        {/* Continuous Pipeline Grid with Connected Progression */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {pipelineSteps.map((step) => {
            return (
              <div
                key={step.step}
                className="p-5 rounded-2xl border border-[#1F293D] bg-[#0B101B] hover:bg-[#0D1424] hover:border-cyan-500/50 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-extrabold font-mono text-indigo-400 group-hover:text-cyan-400 transition-colors">
                      {step.step}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-white/[0.04] text-slate-400 border-white/[0.06] group-hover:bg-cyan-500/15 group-hover:text-cyan-300 group-hover:border-cyan-500/30 transition-colors">
                      {step.stat}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-200 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{step.desc}</p>
                </div>

                <div className="pt-2">
                  <div className="w-full h-1 bg-[#1F293D] rounded-full overflow-hidden relative">
                    <div className="h-full w-1/4 bg-slate-700/70 rounded-full transition-opacity duration-200 group-hover:opacity-0" />
                    <div className="absolute inset-y-0 left-0 w-0 group-hover:w-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-cyan-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. HIGH-CRAFT BENTO GRID (Core Capabilities & Architecture) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 uppercase">
            Engineering Capabilities
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Developer intelligence built for complex codebases.
          </h2>
          <p className="text-sm text-slate-400">
            A comprehensive suite of AST-native tools designed for modern software teams.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bento Card 1: Interactive Architecture Topology & Signal Flow (2 Col Span) */}
          <div className="lg:col-span-2 rounded-2xl border border-[#1F293D] bg-[#0A0E1A] p-6 shadow-xl space-y-4 pro-card-cyan-hover flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-[#1F293D] text-xs font-mono">
              <span className="flex items-center gap-2 text-white font-semibold">
                <Network className="w-4 h-4 text-cyan-400" />
                Multi-Module Dependency Topology
              </span>
              <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                Live AST Graph
              </span>
            </div>

            {/* Architecture Topology Canvas */}
            <div className="rounded-xl bg-[#060911] border border-[#1F293D] p-4 sm:p-5 relative space-y-4 overflow-hidden">
              {/* Symmetrical 3-Tier Dependency Graph SVG */}
              <div className="w-full relative">
                <svg
                  viewBox="0 0 715 210"
                  className="w-full h-auto select-none"
                  style={{ maxHeight: "240px" }}
                >
                  <defs>
                    <linearGradient id="gradAppToChat" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#06B6D4" />
                    </linearGradient>
                    <linearGradient id="gradAppToCanvas" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366F1" />
                      <stop offset="100%" stopColor="#A855F7" />
                    </linearGradient>
                    <linearGradient id="gradChatToRag" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                    <linearGradient id="gradCanvasToRag" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#A855F7" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>

                  {/* Base Inactive Wire Guides */}
                  <path
                    d="M 195 105 C 235 105, 235 50, 275 50"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="2"
                  />
                  <path
                    d="M 195 105 C 235 105, 235 160, 275 160"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="2"
                  />
                  <path
                    d="M 440 50 C 480 50, 480 105, 520 105"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="2"
                  />
                  <path
                    d="M 440 160 C 480 160, 480 105, 520 105"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="2"
                  />
                  <path
                    d="M 357.5 80 L 357.5 130"
                    fill="none"
                    stroke="#1E293B"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />

                  {/* Animated Active Connection Lines */}
                  {/* Path 1: AppShell -> ChatPane */}
                  <path
                    d="M 195 105 C 235 105, 235 50, 275 50"
                    fill="none"
                    stroke="url(#gradAppToChat)"
                    strokeWidth={activeTopologyNode === "app" || activeTopologyNode === "chat" ? "2.5" : "1.5"}
                    strokeDasharray="6 4"
                    opacity={activeTopologyNode === "app" || activeTopologyNode === "chat" ? 1 : 0.4}
                    className="animate-dash-flow"
                  />

                  {/* Path 2: AppShell -> GraphCanvas */}
                  <path
                    d="M 195 105 C 235 105, 235 160, 275 160"
                    fill="none"
                    stroke="url(#gradAppToCanvas)"
                    strokeWidth={activeTopologyNode === "app" || activeTopologyNode === "canvas" ? "2.5" : "1.5"}
                    strokeDasharray="6 4"
                    opacity={activeTopologyNode === "app" || activeTopologyNode === "canvas" ? 1 : 0.4}
                    className="animate-dash-flow"
                  />

                  {/* Path 3: ChatPane -> RAGService */}
                  <path
                    d="M 440 50 C 480 50, 480 105, 520 105"
                    fill="none"
                    stroke="url(#gradChatToRag)"
                    strokeWidth={activeTopologyNode === "chat" || activeTopologyNode === "rag" ? "2.5" : "1.5"}
                    strokeDasharray="6 4"
                    opacity={activeTopologyNode === "chat" || activeTopologyNode === "rag" ? 1 : 0.4}
                    className="animate-dash-flow"
                  />

                  {/* Path 4: GraphCanvas -> RAGService */}
                  <path
                    d="M 440 160 C 480 160, 480 105, 520 105"
                    fill="none"
                    stroke="url(#gradCanvasToRag)"
                    strokeWidth={activeTopologyNode === "canvas" || activeTopologyNode === "rag" ? "2.5" : "1.5"}
                    strokeDasharray="6 4"
                    opacity={activeTopologyNode === "canvas" || activeTopologyNode === "rag" ? 1 : 0.4}
                    className="animate-dash-flow"
                  />

                  {/* Path 5: Chat <-> Canvas Inter-Module Sync */}
                  <path
                    d="M 357.5 80 L 357.5 130"
                    fill="none"
                    stroke="#64748B"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity={activeTopologyNode === "chat" || activeTopologyNode === "canvas" ? 0.9 : 0.35}
                  />
                  <text x="363" y="108" fill="#64748B" fontSize="8" fontFamily="monospace">sync</text>

                  {/* Flowing Signal Packets */}
                  <circle r="3" fill="#06B6D4" opacity="0.9">
                    <animateMotion
                      path="M 195 105 C 235 105, 235 50, 275 50"
                      dur="2.2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle r="3" fill="#A855F7" opacity="0.9">
                    <animateMotion
                      path="M 195 105 C 235 105, 235 160, 275 160"
                      dur="2.5s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle r="3" fill="#10B981" opacity="0.9">
                    <animateMotion
                      path="M 440 50 C 480 50, 480 105, 520 105"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                  <circle r="3" fill="#10B981" opacity="0.9">
                    <animateMotion
                      path="M 440 160 C 480 160, 480 105, 520 105"
                      dur="2.3s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* NODE 1: AppShell.tsx (Tier 1: Root Orchestrator) */}
                  <g
                    onClick={() => setActiveTopologyNode("app")}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                  >
                    {activeTopologyNode === "app" && (
                      <rect
                        x={28}
                        y={73}
                        width={169}
                        height={64}
                        rx={12}
                        fill="none"
                        stroke="#6366F1"
                        strokeWidth="2"
                        strokeOpacity="0.4"
                        className="animate-pulse"
                      />
                    )}
                    <rect
                      x={30}
                      y={75}
                      width={165}
                      height={60}
                      rx={10}
                      fill={activeTopologyNode === "app" ? "#121A30" : "#090E1A"}
                      stroke={activeTopologyNode === "app" ? "#6366F1" : "#1E293B"}
                      strokeWidth={activeTopologyNode === "app" ? "1.5" : "1"}
                      className="transition-colors hover:stroke-indigo-400"
                    />
                    <circle cx={48} cy={95} r={4} fill="#6366F1" />
                    <text x={58} y={99} fill="#F8FAFC" fontSize="11" fontWeight="600" fontFamily="monospace">
                      AppShell.tsx
                    </text>
                    <text x={44} y={119} fill="#94A3B8" fontSize="9.5" fontFamily="monospace">
                      UI Workstation
                    </text>
                    {/* Port Anchor */}
                    <circle cx={195} cy={105} r={3.5} fill="#6366F1" stroke="#060911" strokeWidth="1.5" />
                  </g>

                  {/* NODE 2: ChatPane.tsx (Tier 2: Grounded Chat) */}
                  <g
                    onClick={() => setActiveTopologyNode("chat")}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                  >
                    {activeTopologyNode === "chat" && (
                      <rect
                        x={273}
                        y={18}
                        width={169}
                        height={64}
                        rx={12}
                        fill="none"
                        stroke="#06B6D4"
                        strokeWidth="2"
                        strokeOpacity="0.4"
                        className="animate-pulse"
                      />
                    )}
                    <rect
                      x={275}
                      y={20}
                      width={165}
                      height={60}
                      rx={10}
                      fill={activeTopologyNode === "chat" ? "#0D202D" : "#090E1A"}
                      stroke={activeTopologyNode === "chat" ? "#06B6D4" : "#1E293B"}
                      strokeWidth={activeTopologyNode === "chat" ? "1.5" : "1"}
                      className="transition-colors hover:stroke-cyan-400"
                    />
                    <circle cx={293} cy={40} r={4} fill="#06B6D4" />
                    <text x={303} y={44} fill="#F8FAFC" fontSize="11" fontWeight="600" fontFamily="monospace">
                      ChatPane.tsx
                    </text>
                    <text x={289} y={64} fill="#94A3B8" fontSize="9.5" fontFamily="monospace">
                      Grounded Chat
                    </text>
                    {/* Ports */}
                    <circle cx={275} cy={50} r={3.5} fill="#06B6D4" stroke="#060911" strokeWidth="1.5" />
                    <circle cx={440} cy={50} r={3.5} fill="#06B6D4" stroke="#060911" strokeWidth="1.5" />
                    <circle cx={357.5} cy={80} r={3} fill="#06B6D4" stroke="#060911" strokeWidth="1.5" />
                  </g>

                  {/* NODE 3: GraphCanvas.tsx (Tier 2: Interactive Graph) */}
                  <g
                    onClick={() => setActiveTopologyNode("canvas")}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                  >
                    {activeTopologyNode === "canvas" && (
                      <rect
                        x={273}
                        y={128}
                        width={169}
                        height={64}
                        rx={12}
                        fill="none"
                        stroke="#A855F7"
                        strokeWidth="2"
                        strokeOpacity="0.4"
                        className="animate-pulse"
                      />
                    )}
                    <rect
                      x={275}
                      y={130}
                      width={165}
                      height={60}
                      rx={10}
                      fill={activeTopologyNode === "canvas" ? "#1F152E" : "#090E1A"}
                      stroke={activeTopologyNode === "canvas" ? "#A855F7" : "#1E293B"}
                      strokeWidth={activeTopologyNode === "canvas" ? "1.5" : "1"}
                      className="transition-colors hover:stroke-purple-400"
                    />
                    <circle cx={293} cy={150} r={4} fill="#A855F7" />
                    <text x={303} y={154} fill="#F8FAFC" fontSize="11" fontWeight="600" fontFamily="monospace">
                      GraphCanvas.tsx
                    </text>
                    <text x={289} y={174} fill="#94A3B8" fontSize="9.5" fontFamily="monospace">
                      Interactive Graph
                    </text>
                    {/* Ports */}
                    <circle cx={275} cy={160} r={3.5} fill="#A855F7" stroke="#060911" strokeWidth="1.5" />
                    <circle cx={440} cy={160} r={3.5} fill="#A855F7" stroke="#060911" strokeWidth="1.5" />
                    <circle cx={357.5} cy={130} r={3} fill="#A855F7" stroke="#060911" strokeWidth="1.5" />
                  </g>

                  {/* NODE 4: RAGService (Tier 3: Engine Core) */}
                  <g
                    onClick={() => setActiveTopologyNode("rag")}
                    className="cursor-pointer"
                    role="button"
                    tabIndex={0}
                  >
                    {activeTopologyNode === "rag" && (
                      <rect
                        x={518}
                        y={73}
                        width={169}
                        height={64}
                        rx={12}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2"
                        strokeOpacity="0.4"
                        className="animate-pulse"
                      />
                    )}
                    <rect
                      x={520}
                      y={75}
                      width={165}
                      height={60}
                      rx={10}
                      fill={activeTopologyNode === "rag" ? "#0E241B" : "#090E1A"}
                      stroke={activeTopologyNode === "rag" ? "#10B981" : "#1E293B"}
                      strokeWidth={activeTopologyNode === "rag" ? "1.5" : "1"}
                      className="transition-colors hover:stroke-emerald-400"
                    />
                    <circle cx={538} cy={95} r={4} fill="#10B981" />
                    <text x={548} y={99} fill="#F8FAFC" fontSize="11" fontWeight="600" fontFamily="monospace">
                      RAGService
                    </text>
                    <text x={534} y={119} fill="#94A3B8" fontSize="9.5" fontFamily="monospace">
                      Engine Core
                    </text>
                    {/* Port */}
                    <circle cx={520} cy={105} r={3.5} fill="#10B981" stroke="#060911" strokeWidth="1.5" />
                  </g>
                </svg>
              </div>

              {/* Module Filter Chips */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#1F293D]/60 text-xs font-mono">
                <span className="text-[11px] text-slate-400 font-sans">Click any module node to inspect:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {Object.entries(topologyNodes).map(([k, val]) => {
                    const isSel = activeTopologyNode === k;
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() => setActiveTopologyNode(k)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono transition-all cursor-pointer ${
                          isSel
                            ? `${val.color} font-semibold shadow-md`
                            : "bg-[#0A0F1D] border-[#1F293D] text-slate-400 hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        {val.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Call Context & Dependents */}
              <div className="p-3.5 rounded-xl bg-[#080C14] border border-[#1F293D] space-y-2 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white font-mono">
                      {topologyNodes[activeTopologyNode]?.label}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.05] text-slate-300 border border-white/[0.08]">
                      {topologyNodes[activeTopologyNode]?.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="text-cyan-400">
                      {topologyNodes[activeTopologyNode]?.deps.length} Downstream Dependents
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      0 Cycles
                    </span>
                  </div>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  {topologyNodes[activeTopologyNode]?.desc}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Connected:</span>
                  {topologyNodes[activeTopologyNode]?.deps.map((dep) => (
                    <span
                      key={dep}
                      className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-indigo-500/10 border border-indigo-500/25 text-indigo-300"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Trace cyclic imports, analyze upstream and downstream blast radius, and discover architectural bottlenecks without manual code crawling.
            </p>
          </div>

          {/* Bento Card 2: Zero-Hallucination AST Grounding (1 Col Span) */}
          <div className="rounded-2xl border border-[#1F293D] bg-[#0A0E1A] p-6 shadow-xl space-y-4 pro-card-hover flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Zero-Hallucination Fencing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Deterministic Post-Gen Citation Validator checks every cited line against your live Git branch. If code doesn't exist, RepoMind strictly refuses.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#060911] border border-[#1F293D] font-mono text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Cosine Confidence:</span>
                <span className="text-emerald-400 font-bold">0.942 [PASS]</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Symbol Tree Check:</span>
                <span className="text-cyan-400 font-bold">Verified Exact</span>
              </div>
            </div>
          </div>

          {/* Bento Card 3: PR Hazard & Breaking Change Detector (1 Col Span) */}
          <div className="rounded-2xl border border-[#1F293D] bg-[#0A0E1A] p-6 shadow-xl space-y-4 pro-card-hover flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <GitBranch className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">PR Hazard & Blast Radius</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Before merging code, calculate exactly what breaks downstream. Detect breaking contract signatures across routes and components instantly.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#060911] border border-amber-500/25 font-mono text-xs space-y-1">
              <div className="text-[11px] text-amber-400 font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Blast Radius: 4 Affected Services</span>
              </div>
              <p className="text-[10px] text-slate-400">
                AuthService.validateToken modified &bull; 2 breaking callers
              </p>
            </div>
          </div>

          {/* Bento Card 4: Differential Incremental Ingestion (2 Col Span) */}
          <div className="lg:col-span-2 rounded-2xl border border-[#1F293D] bg-[#0A0E1A] p-6 shadow-xl space-y-4 pro-card-hover flex flex-col justify-between">
            <div className="flex items-center justify-between pb-2 border-b border-[#1F293D] text-xs font-mono">
              <span className="flex items-center gap-2 text-white font-semibold">
                <Zap className="w-4 h-4 text-indigo-400" />
                Differential Incremental Ingestion
              </span>
              <span className="text-indigo-400">&lt;250ms Re-Index</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#060911] border border-[#1F293D] space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Git Webhook</span>
                <p className="text-white font-bold">Push / PR Hook</p>
                <p className="text-[10px] text-slate-400">Instant Event Trigger</p>
              </div>
              <div className="p-3 rounded-xl bg-[#060911] border border-[#1F293D] space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Diff Analyzer</span>
                <p className="text-cyan-400 font-bold">Modified Files Only</p>
                <p className="text-[10px] text-slate-400">Zero Full Rescans</p>
              </div>
              <div className="p-3 rounded-xl bg-[#060911] border border-[#1F293D] space-y-1">
                <span className="text-[10px] text-slate-500 uppercase">Vector Upsert</span>
                <p className="text-emerald-400 font-bold">Differential Chunking</p>
                <p className="text-[10px] text-slate-400">BullMQ Async Queue</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              When developers push code, RepoMind re-indexes only the modified AST nodes. Your codebase knowledge graph stays in continuous real-time sync with zero wait time.
            </p>
          </div>
        </div>
      </section>

      {/* 5. CLEAN HAIRLINE FAQ ACCORDION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 uppercase">
            Questions & Answers
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="border-t border-[#1F293D] divide-y divide-[#1F293D]">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div key={idx} className="py-4 transition-colors">
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full text-left flex items-center justify-between text-sm font-semibold text-slate-200 hover:text-white transition cursor-pointer group"
                >
                  <span className="group-hover:text-indigo-300 transition-colors pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180 text-cyan-400" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="pt-3 pr-6 text-xs text-slate-400 leading-relaxed animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. CLIMAX BOTTOM CTA */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="rounded-3xl border border-[#1F293D] bg-gradient-to-b from-[#0D1424] to-[#080C14] p-10 sm:p-14 shadow-2xl relative overflow-hidden pro-card-hover space-y-6">
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Stop searching your codebase. <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-cyan-300">
              Start understanding it.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
            Connect your GitHub repository in under 60 seconds. Full Tree-sitter AST parsing, zero-hallucination verification, and high-performance hybrid retrieval included.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <button
              type="button"
              onClick={loginWithGitHub}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-xl shadow-indigo-500/25 cursor-pointer btn-shimmer group"
            >
              <FolderGit2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Connect GitHub Free</span>
            </button>
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#0D1424] hover:bg-[#131D31] text-slate-200 hover:text-white font-semibold text-sm border border-[#1F293D] hover:border-cyan-500/40 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <span>Explore Interactive Demo</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
