import type { Request, Response } from "express";
import crypto from "node:crypto";
import { config } from "../../config/env.js";
import { authService } from "./auth.service.js";
import { UserModel } from "./models/user.model.js";
import { encryptToken } from "../../utils/crypto.js";

export class AuthController {
  /**
   * Redirects user to GitHub's authorization page with a CSRF-protecting state token.
   */
  async initiateGitHubOAuth(_req: Request, res: Response): Promise<void> {
    const state = crypto.randomBytes(24).toString("hex");

    // Store state in an HTTP-only cookie for 10 minutes to validate in callback
    res.cookie("oauth_state", state, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    });

    const url = authService.getAuthorizationUrl(state);
    res.redirect(url);
  }

  /**
   * GitHub OAuth Callback: validates state, exchanges code for token, upserts user, establishes session.
   */
  async handleGitHubCallback(req: Request, res: Response): Promise<void> {
    const { code, state } = req.query as { code?: string; state?: string };
    const savedState = req.cookies?.oauth_state;

    // Validate CSRF state parameter
    if (!state || !savedState || state !== savedState) {
      res.clearCookie("oauth_state");
      res.status(400).send("OAuth state verification failed. Possible CSRF attack detected.");
      return;
    }

    res.clearCookie("oauth_state");

    if (!code) {
      res.status(400).send("Missing OAuth authorization code from GitHub.");
      return;
    }

    try {
      // Exchange code for token
      const accessToken = await authService.exchangeCodeForToken(code);

      // Fetch GitHub profile
      const profile = await authService.fetchGitHubProfile(accessToken);

      // Encrypt token and persist user
      const user = await authService.findOrCreateUser(profile, accessToken);

      // Establish session
      (req.session as any).userId = user._id.toString();

      req.session.save((err) => {
        if (err) {
          console.error("[RepoMind Auth] Failed to save session:", err);
          res.status(500).send("Failed to initialize user session.");
          return;
        }

        res.redirect(`${config.webUrl}/?auth=success`);
      });
    } catch (err: any) {
      console.error("[RepoMind Auth] OAuth callback failed:", err.message);
      res.redirect(`${config.webUrl}/?auth=error&message=${encodeURIComponent(err.message)}`);
    }
  }

  /**
   * Returns current session user or { authenticated: false, user: null } if unauthenticated.
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    const userId = (req.session as any)?.userId;

    if (!userId) {
      res.status(200).json({ authenticated: false, user: null });
      return;
    }

    try {
      const user = await authService.getUserSessionById(userId);
      if (!user) {
        req.session.destroy(() => {});
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
   * Terminates session and clears session cookie.
   */
  async logout(req: Request, res: Response): Promise<void> {
    req.session.destroy((err) => {
      if (err) {
        console.error("[RepoMind Auth] Error destroying session:", err);
      }
      res.clearCookie("repomind.sid");
      res.status(200).json({ message: "Logged out successfully" });
    });
  }

  /**
   * Development-only login helper to quickly test full platform functionality without live GitHub app credentials.
   */
  async devLogin(req: Request, res: Response): Promise<void> {
    if (config.nodeEnv === "production") {
      res.status(403).json({ error: "Development login is disabled in production" });
      return;
    }

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

      req.session.save((err) => {
        if (err) {
          res.status(500).json({ error: "Session save failed" });
          return;
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
        });
      });
    } catch (err: any) {
      console.error("[RepoMind Auth] Dev login failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
}

export const authController = new AuthController();
