import type { Request, Response } from "express";
import crypto from "node:crypto";
import { config } from "../../config/env.js";
import { authService } from "./auth.service.js";
import { UserModel } from "./models/user.model.js";
import { encryptToken } from "../../utils/crypto.js";
import {
  setAuthCookies,
  clearAuthCookies,
  resolveUserId,
  createSessionToken,
} from "../../utils/session.js";

export class AuthController {
  /**
   * Redirects user to GitHub's authorization page with a CSRF-protecting state token.
   */
  async initiateGitHubOAuth(req: Request, res: Response): Promise<void> {
    const state = crypto.randomBytes(24).toString("hex");
    const callbackUrl = authService.getCallbackUrl(req);

    // Store state in an HTTP-only cookie for 10 minutes to validate in callback
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    });
    res.cookie("oauth_callback", callbackUrl, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    });

    const url = authService.getAuthorizationUrl(state, req);
    res.redirect(url);
  }

  /**
   * GitHub OAuth Callback: validates state, exchanges code for token, upserts user, establishes session.
   */
  async handleGitHubCallback(req: Request, res: Response): Promise<void> {
    const { code, state, error, error_description } = req.query as {
      code?: string;
      state?: string;
      error?: string;
      error_description?: string;
    };
    const savedState = req.cookies?.oauth_state;
    const savedCallback = req.cookies?.oauth_callback || authService.getCallbackUrl(req);

    // Clear OAuth state cookies
    res.clearCookie("oauth_state");
    res.clearCookie("oauth_callback");

    // Handle OAuth provider error (e.g. user cancelled or permissions denied)
    if (error) {
      console.warn(`[OAuth] GitHub callback reported error: ${error} - ${error_description || "no description"}`);
      res.redirect(`${config.webUrl}/login?error=${encodeURIComponent(error_description || error)}`);
      return;
    }

    // Validate CSRF state parameter
    if (!state || !savedState || state !== savedState) {
      console.warn("[OAuth] CSRF state mismatch detected in callback");
      res.redirect(`${config.webUrl}/login?error=${encodeURIComponent("Security state verification failed. Please try again.")}`);
      return;
    }

    if (!code) {
      res.redirect(`${config.webUrl}/login?error=${encodeURIComponent("Missing authorization code from GitHub.")}`);
      return;
    }

    try {
      // Exchange code for token with matching redirect_uri
      const accessToken = await authService.exchangeCodeForToken(code, savedCallback);

      // Fetch GitHub profile
      const profile = await authService.fetchGitHubProfile(accessToken);
      console.log(`[OAuth] GitHub user profile fetched for: ${profile.login}`);

      // Encrypt token and persist user
      const user = await authService.findOrCreateUser(profile, accessToken);
      console.log(`[OAuth] Local user persisted/found: ${user._id}`);

      // Establish session with both MongoStore and AES-encrypted cookie
      const userIdStr = user._id.toString();
      (req.session as any).userId = userIdStr;
      setAuthCookies(res, userIdStr);

      // Clean up temporary OAuth cookies
      res.clearCookie("oauth_state");
      res.clearCookie("oauth_callback");

      req.session.save((err) => {
        if (err) {
          console.warn("[OAuth] Warning saving session to store (fallback cookie active):", err.message);
        }

        console.log(`[OAuth] Session initialized. Redirecting to ${config.webUrl}/app/dashboard`);
        res.redirect(`${config.webUrl}/app/dashboard`);
      });
    } catch (err: any) {
      console.error("[OAuth] Callback processing failed:", err.message);
      res.redirect(`${config.webUrl}/login?error=${encodeURIComponent(err.message)}`);
    }
  }

  /**
   * Returns current session user or { authenticated: false, user: null } if unauthenticated.
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    const userId = resolveUserId(req);

    if (!userId) {
      res.status(200).json({ authenticated: false, user: null });
      return;
    }

    try {
      const user = await authService.getUserSessionById(userId);
      if (!user) {
        clearAuthCookies(res);
        if (req.session) {
          req.session.destroy(() => {});
        }
        res.status(200).json({ authenticated: false, user: null });
        return;
      }

      res.status(200).json({ authenticated: true, user });
    } catch (err: any) {
      console.error("[RepoMind Auth] Error fetching session user:", err.message);
      res.status(500).json({ error: "Failed to load session user" });
    }
  }

  /**
   * Terminates session and clears session cookies.
   */
  async logout(req: Request, res: Response): Promise<void> {
    clearAuthCookies(res);
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.warn("[RepoMind Auth] Error destroying session:", err.message);
        }
        res.status(200).json({ message: "Logged out successfully" });
      });
    } else {
      res.status(200).json({ message: "Logged out successfully" });
    }
  }

  /**
   * Development-only login helper to quickly test full platform functionality without live GitHub app credentials.
   */
  async devLogin(req: Request, res: Response): Promise<void> {
    try {
      const mockUser = {
        id: "000000000000000000001001",
        githubId: "dev-gh-1001",
        username: "dev-architect",
        displayName: "Dev Architect",
        email: "architect@repomind.local",
        avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
        encryptedAccessToken: encryptToken("mock_ghp_development_token_for_local_testing_only"),
      };

      authService.setDevUser(mockUser);

      (req.session as any).userId = mockUser.id;
      setAuthCookies(res, mockUser.id);
      const sessionToken = createSessionToken(mockUser.id);

      req.session.save((err) => {
        if (err) {
          console.warn("[RepoMind Auth] Dev session store warning:", err.message);
        }
        res.status(200).json({
          authenticated: true,
          user: {
            id: mockUser.id,
            githubId: mockUser.githubId,
            username: mockUser.username,
            displayName: mockUser.displayName,
            email: mockUser.email,
            avatarUrl: mockUser.avatarUrl,
          },
          sessionToken,
        });
      });
    } catch (err: any) {
      console.error("[RepoMind Auth] Dev login failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
}

export const authController = new AuthController();
