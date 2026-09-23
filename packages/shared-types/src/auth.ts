export interface User {
  id: string;
  githubId: string;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  githubId: string;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface EncryptedToken {
  encryptedData: string;
  iv: string;
  authTag: string;
}

export interface GitHubProfile {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface AuthResponse {
  user: SessionUser;
  authenticated: boolean;
}

