import { config } from "../../config/env.js";
import { encryptToken, decryptToken } from "../../utils/crypto.js";
import { UserModel, type IUserDocument } from "./models/user.model.js";
import { isDbConnected } from "../../config/database.js";
import type { GitHubProfile, SessionUser } from "@repomind/shared-types";

// In-memory user store fallback for local development when MongoDB is offline
const inMemoryUsers = new Map<string, SessionUser & { encryptedAccessToken?: any }>();

export class AuthService {
  /**
   * Generates the GitHub OAuth authorization URL with CSRF state token and scopes.
   */
  getAuthorizationUrl(state: string): string {
    const clientId = config.githubClientId || "placeholder_client_id";
    const callbackUrl = config.githubCallbackUrl || `${config.apiUrl}/api/auth/github/callback`;
    const scopes = encodeURIComponent("read:user,repo");

    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      callbackUrl,
    )}&scope=${scopes}&state=${state}`;
  }

  /**
   * Exchanges authorization code for a GitHub access token.
   */
  async exchangeCodeForToken(code: string): Promise<string> {
    if (!config.githubClientId || !config.githubClientSecret) {
      throw new Error(
        "GitHub OAuth credentials (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET) are not configured in environment.",
      );
    }

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: config.githubClientId,
        client_secret: config.githubClientSecret,
        code,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`GitHub token exchange failed (HTTP ${response.status}): ${errText}`);
    }

    const data = (await response.json()) as { access_token?: string; error?: string; error_description?: string };

    if (data.error || !data.access_token) {
      throw new Error(data.error_description || data.error || "Failed to retrieve access token from GitHub");
    }

    return data.access_token;
  }

  /**
   * Fetches the user profile and primary email from GitHub API.
   */
  async fetchGitHubProfile(accessToken: string): Promise<GitHubProfile> {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "RepoMind-OAuth",
    };

    const userRes = await fetch("https://api.github.com/user", { headers });
    if (!userRes.ok) {
      throw new Error(`Failed to fetch GitHub profile (HTTP ${userRes.status})`);
    }

    const rawUser = (await userRes.json()) as any;
    let email = rawUser.email;

    // If user's email is private, fetch primary verified email from /user/emails
    if (!email) {
      try {
        const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
        if (emailsRes.ok) {
          const emails = (await emailsRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
          const primary = emails.find((e) => e.primary && e.verified) || emails[0];
          if (primary) email = primary.email;
        }
      } catch (err) {
        // Non-critical, continue without email
      }
    }

    return {
      id: rawUser.id,
      login: rawUser.login,
      name: rawUser.name || null,
      email: email || null,
      avatar_url: rawUser.avatar_url || null,
    };
  }

  /**
   * Encrypts the access token and persists or updates the user document in MongoDB.
   */
  async findOrCreateUser(profile: GitHubProfile, accessToken: string): Promise<IUserDocument> {
    const encryptedAccessToken = encryptToken(accessToken);

    const updatedUser = await UserModel.findOneAndUpdate(
      { githubId: String(profile.id) },
      {
        githubId: String(profile.id),
        username: profile.login,
        displayName: profile.name,
        email: profile.email,
        avatarUrl: profile.avatar_url,
        encryptedAccessToken,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    return updatedUser;
  }

  /**
   * Retrieves a user by their ID and returns safe session data.
   */
  async getUserSessionById(id: string): Promise<SessionUser | null> {
    if (inMemoryUsers.has(id)) {
      const user = inMemoryUsers.get(id)!;
      return {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
      };
    }

    if (isDbConnected()) {
      try {
        const user = await UserModel.findById(id);
        if (!user) return null;
        return user.toSessionUser();
      } catch (err) {
        return null;
      }
    }

    return null;
  }

  /**
   * Registers or updates a development in-memory user.
   */
  setDevUser(user: SessionUser & { encryptedAccessToken?: any }): void {
    inMemoryUsers.set(user.id, user);
  }

  /**
   * Server-side only: decrypts the stored GitHub token for background operations.
   * NEVER exposed via API endpoints.
   */
  async getDecryptedToken(userId: string): Promise<string | null> {
    if (inMemoryUsers.has(userId)) {
      const u = inMemoryUsers.get(userId);
      if (!u?.encryptedAccessToken) return null;
      return decryptToken(u.encryptedAccessToken);
    }

    if (isDbConnected()) {
      const user = await UserModel.findById(userId);
      if (!user?.encryptedAccessToken) return null;
      return decryptToken(user.encryptedAccessToken);
    }

    return null;
  }
}

export const authService = new AuthService();
