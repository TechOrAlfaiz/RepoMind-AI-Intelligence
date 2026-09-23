import React, { useState, useEffect, useRef } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FolderGit2,
  Terminal,
  Network,
  Bug,
  GitPullRequest,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Building2,
  Heart,
  PanelLeft,
  PanelLeftClose,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useOrg } from "../context/OrgContext";
import { useRepo } from "../context/RepoContext";

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { organizations, activeOrg, setActiveOrg } = useOrg();
  const { repositories } = useRepo();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Auto-collapse if current route is workspace
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return window.location.pathname.includes("/workspace");
  });

  const prevPathnameRef = useRef<string>(location.pathname);

  // Automatically collapse side navbar whenever user enters the workspace
  useEffect(() => {
    const isNowWorkspace = location.pathname.includes("/workspace");
    const wasWorkspace = prevPathnameRef.current.includes("/workspace");
    prevPathnameRef.current = location.pathname;

    if (isNowWorkspace && !wasWorkspace) {
      setSidebarCollapsed(true);
    }
  }, [location.pathname]);

  // Ensure window scroll is reset so content never scrolls under navbar on route navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Resizable Nav Sidebar State
  const [navSidebarWidth, setNavSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem("repomind_nav_sidebar_width");
    return saved ? Math.max(180, Math.min(360, parseInt(saved, 10))) : 240;
  });
  const [isResizingNavSidebar, setIsResizingNavSidebar] = useState(false);

  const handleNavResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (sidebarCollapsed) return;
    setIsResizingNavSidebar(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(360, moveEvent.clientX));
      setNavSidebarWidth(newWidth);
      localStorage.setItem("repomind_nav_sidebar_width", String(newWidth));
    };

    const onMouseUp = () => {
      setIsResizingNavSidebar(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const navItems = [
    { name: "Dashboard", path: "/app/dashboard", icon: LayoutDashboard },
    { name: "Repositories", path: "/app/repositories", icon: FolderGit2, badge: repositories.length > 0 ? repositories.length : undefined },
    { name: "AI Workspace", path: "/app/workspace", icon: Terminal },
    { name: "Architecture", path: "/app/architecture", icon: Network },
    { name: "Bug Investigator", path: "/app/bugs", icon: Bug },
    { name: "PR Intelligence", path: "/app/prs", icon: GitPullRequest },
    { name: "Analytics & Telemetry", path: "/app/analytics", icon: BarChart3 },
    { name: "Settings", path: "/app/settings", icon: Settings },
    { name: "User Profile", path: "/app/profile", icon: User },
  ];

  // Derive breadcrumb from current path
  const getBreadcrumb = () => {
    const p = location.pathname;
    if (p.includes("/workspace")) return "AI Engineering Workspace";
    if (p.includes("/repositories")) return "Connected Repositories";
    if (p.includes("/architecture")) return "Architecture & Dependency Graph";
    if (p.includes("/bugs")) return "Bug Root-Cause Investigator";
    if (p.includes("/prs")) return "Pull Request Intelligence";
    if (p.includes("/analytics")) return "Telemetry & Metrics";
    if (p.includes("/settings")) return "System & Organization Settings";
    if (p.includes("/profile")) return "Developer Profile & Account";
    return "Command Center Dashboard";
  };

  const handleLogout = async () => {
    await logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-[#080C14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background ambient lighting */}
      <div className="aura-glow-top pointer-events-none" />

      {/* Top Application Bar */}
      <header className="h-14 shrink-0 border-b border-white/[0.08] bg-[#080C14]/95 backdrop-blur-xl z-40 flex items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile Toggle, Brand & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-slate-300"
            aria-label="Toggle App Navigation"
          >
            {mobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <Link to="/app/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-[#080C14] rounded-[7px] flex items-center justify-center">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              </div>
            </div>
            <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">RepoMind</span>
          </Link>

          <div className="hidden sm:flex items-center text-xs text-slate-500 pl-2 border-l border-white/[0.08]">
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 mr-1" />
            <span className="text-slate-300 font-medium">{getBreadcrumb()}</span>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-3">
          {/* Organization Switcher */}
          <div className="hidden md:flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1 text-xs">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
            {organizations.length > 0 ? (
              <select
                value={activeOrg?.id || ""}
                onChange={(e) => {
                  const target = organizations.find((o) => o.id === e.target.value);
                  if (target) setActiveOrg(target);
                }}
                className="bg-transparent text-[11px] font-semibold text-slate-200 outline-none cursor-pointer"
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id} className="bg-[#090D17] text-white">
                    {org.name} ({org.userRole.toUpperCase()})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-[11px] text-slate-400">Personal Workspace</span>
            )}
          </div>

          {/* Quick link to Public Landing */}
          <Link
            to="/"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-[11px] text-slate-300 transition"
            title="View Public Marketing Website"
          >
            <span>Website</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </Link>

          {/* Status Probe */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="hidden sm:inline">Engine Live</span>
          </div>

          {/* User Account / Profile / Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/[0.08]">
            <Link
              to="/app/profile"
              className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] shadow-md shadow-indigo-500/20 hover:scale-110 hover:shadow-cyan-500/30 transition cursor-pointer flex items-center justify-center group"
              title={`View User Profile (${user?.username || "Developer"})`}
            >
              <div className="w-full h-full bg-[#080C14] group-hover:bg-[#0B101E] rounded-full flex items-center justify-center text-xs font-bold text-indigo-200 group-hover:text-cyan-300 transition overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  user?.username ? user.username.charAt(0).toUpperCase() : "U"
                )}
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/[0.04] transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Desktop Sidebar */}
        <aside
          style={sidebarCollapsed ? { width: "4.25rem" } : { width: `${navSidebarWidth}px` }}
          className={`hidden md:flex flex-col border-r border-white/[0.08] bg-[#070B12]/80 backdrop-blur-xl shrink-0 z-30 ${
            sidebarCollapsed ? "overflow-visible" : ""
          } ${
            isResizingNavSidebar ? "transition-none" : "transition-[width] duration-150"
          }`}
        >
          {/* Navigation Items */}
          <div className={`flex-1 py-4 px-2 space-y-1.5 ${sidebarCollapsed ? "overflow-visible" : "overflow-y-auto"}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.name} className="relative group flex items-center justify-center">
                  <NavLink
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center ${
                        sidebarCollapsed
                          ? "justify-center w-10 h-10 px-0"
                          : "gap-3 px-3 py-2 w-full"
                      } rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10"
                          : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                      }`
                    }
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 transition-transform ${sidebarCollapsed ? "group-hover:text-cyan-400 group-hover:scale-110" : "group-hover:text-indigo-400"}`} />
                    {!sidebarCollapsed && (
                      <span className="flex-1 truncate">{item.name}</span>
                    )}
                    {!sidebarCollapsed && item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-full bg-white/[0.06] text-slate-400 group-hover:text-white">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>

                  {/* Floating popup flyout on hover when collapsed - only shows their name */}
                  {sidebarCollapsed && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 transform -translate-x-1.5 group-hover:translate-x-0">
                      <div className="relative flex items-center px-3 py-1.5 rounded-lg bg-[#0C1220]/95 backdrop-blur-xl border border-[#25324D] text-xs font-semibold text-white shadow-2xl shadow-black/80 whitespace-nowrap">
                        <span>{item.name}</span>
                        {/* Triangular pointer */}
                        <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#0C1220] border-l border-b border-[#25324D] rotate-45" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bottom Sidebar Controls */}
          <div className="p-3 border-t border-white/[0.08] space-y-2">
            {!sidebarCollapsed && (
              <Link
                to="/app/profile"
                className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.06] hover:border-indigo-500/30 flex items-center gap-2.5 transition cursor-pointer group"
                title="View User Profile"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-mono group-hover:bg-emerald-500/30 transition">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-slate-200 group-hover:text-white truncate transition">
                    {user?.username || "Developer"}
                  </div>
                  <div className="text-[10px] text-slate-400 group-hover:text-cyan-400 font-mono truncate transition">
                    View Profile &rarr;
                  </div>
                </div>
              </Link>
            )}

            {sidebarCollapsed && (
              <div className="relative group flex justify-center">
                <Link
                  to="/app/profile"
                  className="w-9 h-9 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 hover:border-cyan-400/50 flex items-center justify-center text-xs font-bold text-indigo-200 hover:text-cyan-300 transition cursor-pointer"
                  title="View User Profile"
                >
                  {user?.username ? user.username.charAt(0).toUpperCase() : "U"}
                </Link>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 transform -translate-x-1.5 group-hover:translate-x-0">
                  <div className="relative flex items-center px-3 py-1.5 rounded-lg bg-[#0C1220]/95 backdrop-blur-xl border border-[#25324D] text-xs font-semibold text-white shadow-2xl shadow-black/80 whitespace-nowrap">
                    <span>Profile: {user?.username || "Developer"}</span>
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#0C1220] border-l border-b border-[#25324D] rotate-45" />
                  </div>
                </div>
              </div>
            )}

            {!sidebarCollapsed && (
              <div className="pt-0.5 text-center">
                <span className="inline-flex items-center justify-center gap-1 text-[10px] text-slate-500 font-mono">
                  Created with <Heart className="w-2.5 h-2.5 text-rose-500 fill-rose-500 animate-pulse" /> by{" "}
                  <a
                    href="https://github.com/TechOrAlfaiz"
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-400 hover:text-cyan-400 transition"
                  >
                    TechOrAlfaiz
                  </a>
                </span>
              </div>
            )}

            {sidebarCollapsed ? (
              <div className="relative group flex justify-center">
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(false)}
                  className="w-10 h-10 rounded-xl text-slate-400 hover:text-cyan-400 hover:bg-white/[0.04] flex items-center justify-center transition cursor-pointer"
                  aria-label="Open full navbar"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
                <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 transform -translate-x-1.5 group-hover:translate-x-0">
                  <div className="relative flex items-center px-3 py-1.5 rounded-lg bg-[#0C1220]/95 backdrop-blur-xl border border-[#25324D] text-xs font-semibold text-white shadow-2xl shadow-black/80 whitespace-nowrap">
                    <span>Open full navbar</span>
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#0C1220] border-l border-b border-[#25324D] rotate-45" />
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSidebarCollapsed(true)}
                className="w-full py-1.5 px-3 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] text-xs font-mono flex items-center justify-between transition cursor-pointer"
              >
                <span className="text-[11px] text-slate-500">Collapse sidebar</span>
                <PanelLeftClose className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </aside>

        {/* Nav Sidebar Resizer Handle */}
        {!sidebarCollapsed && (
          <div
            onMouseDown={handleNavResizeStart}
            onDoubleClick={() => {
              setNavSidebarWidth(240);
              localStorage.setItem("repomind_nav_sidebar_width", "240");
            }}
            className="hidden md:flex w-2 -ml-1 z-30 cursor-col-resize items-center justify-center group relative select-none"
            title="Drag to resize Navigation (Double-click to reset 240px)"
          >
            <div
              className={`w-[2px] h-full transition-colors ${
                isResizingNavSidebar
                  ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                  : "bg-transparent group-hover:bg-indigo-500/70"
              }`}
            />
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex">
            <div className="w-64 bg-[#070B12] border-r border-white/[0.08] p-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
                  <span className="font-bold text-sm text-white">Application Menu</span>
                  <button
                    onClick={() => setMobileSidebarOpen(false)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.name}
                        to={item.path}
                        onClick={() => setMobileSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                            isActive
                              ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/25"
                              : "text-slate-400 hover:text-white"
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.name}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/[0.08] pt-3">
                <button
                  onClick={handleLogout}
                  className="w-full py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileSidebarOpen(false)} />
          </div>
        )}

        {/* Main Routed Content Area */}
        <main className="flex-1 h-full overflow-y-auto relative min-h-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
