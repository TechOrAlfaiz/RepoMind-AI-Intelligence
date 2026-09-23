import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { OrgProvider } from "./context/OrgContext";
import { RepoProvider } from "./context/RepoContext";

// Layouts & Guards
import { PublicLayout } from "./layouts/PublicLayout";
import { AuthLayout } from "./layouts/AuthLayout";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Public Pages
import { LandingPage } from "./pages/public/LandingPage";
import { FeaturesPage } from "./pages/public/FeaturesPage";
import { HowItWorksPage } from "./pages/public/HowItWorksPage";
import { UseCasesPage } from "./pages/public/UseCasesPage";
import { FaqPage } from "./pages/public/FaqPage";

// Auth Pages
import { LoginPage } from "./pages/auth/LoginPage";
import { SignupPage } from "./pages/auth/SignupPage";
import { ForgotPasswordPage } from "./pages/auth/ForgotPasswordPage";

// App Pages
import { DashboardPage } from "./pages/app/DashboardPage";
import { RepositoriesPage } from "./pages/app/RepositoriesPage";
import { WorkspacePage } from "./pages/app/WorkspacePage";
import { AnalyticsPage } from "./pages/app/AnalyticsPage";
import { SettingsPage } from "./pages/app/SettingsPage";
import { IntelligencePage } from "./pages/app/IntelligencePage";
import { ProfilePage } from "./pages/app/ProfilePage";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OrgProvider>
          <RepoProvider>
            <BrowserRouter>
              <Routes>
                {/* 1. PUBLIC WEBSITE ROUTES */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/features" element={<FeaturesPage />} />
                  <Route path="/how-it-works" element={<HowItWorksPage />} />
                  <Route path="/use-cases" element={<UseCasesPage />} />
                  <Route path="/pricing" element={<Navigate to="/" replace />} />
                  <Route path="/faq" element={<FaqPage />} />
                </Route>

                {/* 2. DEDICATED AUTHENTICATION ROUTES */}
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                </Route>

                {/* 3. AUTHENTICATED APPLICATION ROUTES (PROTECTED) */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/app" element={<AppLayout />}>
                    <Route index element={<Navigate to="/app/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="repositories" element={<RepositoriesPage />} />
                    <Route path="repositories/:id" element={<WorkspacePage />} />
                    <Route path="repositories/:id/chat" element={<WorkspacePage />} />
                    <Route path="repositories/:id/code" element={<WorkspacePage />} />
                    <Route path="repositories/:id/graph" element={<IntelligencePage initialTab="architecture" />} />
                    <Route path="repositories/:id/architecture" element={<IntelligencePage initialTab="architecture" />} />
                    <Route path="repositories/:id/impact" element={<IntelligencePage initialTab="architecture" />} />
                    <Route path="repositories/:id/issues" element={<IntelligencePage initialTab="bug" />} />
                    <Route path="repositories/:id/pull-requests" element={<IntelligencePage initialTab="pr" />} />
                    <Route path="repositories/:id/commits" element={<IntelligencePage initialTab="architecture" />} />
                    <Route path="workspace" element={<WorkspacePage />} />
                    <Route path="architecture" element={<IntelligencePage initialTab="architecture" />} />
                    <Route path="bugs" element={<IntelligencePage initialTab="bug" />} />
                    <Route path="prs" element={<IntelligencePage initialTab="pr" />} />
                    <Route path="pull-requests" element={<Navigate to="/app/prs" replace />} />
                    <Route path="analytics" element={<AnalyticsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                  </Route>
                </Route>

                {/* 4. FALLBACK */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </RepoProvider>
        </OrgProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
