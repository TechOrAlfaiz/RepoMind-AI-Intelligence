import mongoose from "mongoose";
import { RepositoryModel, type IRepositoryDocument } from "./models/repo.model.js";
import { authService } from "../auth/auth.service.js";
import { isDbConnected } from "../../config/database.js";
import { deleteRepoVectors } from "../../config/vector.js";
import { orgService } from "../orgs/org.service.js";
import { chunkService } from "../chunking/chunk.service.js";
import type { Repository, ConnectRepoDTO, GitHubRepoListItem } from "@repomind/shared-types";

// In-memory repositories store for offline local development
export const devRepos = new Map<string, Repository>();

export class RepoService {
  /**
   * Fetches GitHub repositories available to the authenticated user via their decrypted OAuth token.
   */
  async listUserGitHubRepos(userId: string): Promise<GitHubRepoListItem[]> {
    const token = await authService.getDecryptedToken(userId);

    // If no token or local mock token, fetch user's real public repositories
    if (!token || token.startsWith("mock_ghp_")) {
      try {
        const publicRes = await fetch("https://api.github.com/users/TechOrAlfaiz/repos?sort=updated&per_page=30", {
          headers: { "User-Agent": "RepoMind-RepoService", Accept: "application/vnd.github.v3+json" },
        });
        if (publicRes.ok) {
          const publicRepos = (await publicRes.json()) as any[];
          if (Array.isArray(publicRepos) && publicRepos.length > 0) {
            return publicRepos.map((r) => ({
              id: r.id,
              name: r.name,
              fullName: r.full_name,
              defaultBranch: r.default_branch || "main",
              isPrivate: Boolean(r.private),
              description: r.description || `${r.name} repository by TechOrAlfaiz`,
              updatedAt: r.updated_at,
            }));
          }
        }
      } catch (err: any) {
        console.warn("[RepoMind RepoService] Could not fetch public repos for TechOrAlfaiz:", err.message);
      }

      return [
        {
          id: 101,
          name: "repomind-core",
          fullName: "repomind/repomind-core",
          defaultBranch: "main",
          isPrivate: false,
          description: "Multi-tenant AI code intelligence platform core engine",
          updatedAt: new Date().toISOString(),
        },
        {
          id: 102,
          name: "enterprise-api",
          fullName: "acme/enterprise-api",
          defaultBranch: "main",
          isPrivate: true,
          description: "Microservices gateway and backend API",
          updatedAt: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: 103,
          name: "cloud-infrastructure",
          fullName: "acme/cloud-infrastructure",
          defaultBranch: "production",
          isPrivate: true,
          description: "Terraform & Kubernetes cluster orchestrations",
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: 104,
          name: "react-frontend-dashboard",
          fullName: "acme/react-frontend-dashboard",
          defaultBranch: "master",
          isPrivate: false,
          description: "Customer-facing analytics dashboard",
          updatedAt: new Date(Date.now() - 172800000).toISOString(),
        },
      ];
    }

    try {
      const response = await fetch(
        "https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member",
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "RepoMind-RepoService",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch GitHub repositories (HTTP ${response.status})`);
      }

      const rawRepos = (await response.json()) as any[];
      return rawRepos.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        defaultBranch: r.default_branch || "main",
        isPrivate: r.private,
        description: r.description || null,
        updatedAt: r.updated_at,
      }));
    } catch (err: any) {
      console.error("[RepoMind Repo] Error fetching GitHub repos:", err.message);
      throw err;
    }
  }

  /**
   * Connects a repository to an organization.
   */
  async connectRepo(orgId: string, dto: ConnectRepoDTO): Promise<Repository> {
    const branch = dto.branch || dto.defaultBranch || "main";

    if (!isDbConnected()) {
      // Check for duplicates in dev store
      for (const r of devRepos.values()) {
        if (r.organizationId === orgId && r.githubRepoId === dto.githubRepoId) {
          throw new Error("Repository is already connected to this organization");
        }
      }

      const repoId = `repo_${Date.now()}`;
      const now = new Date().toISOString();
      const newRepo: Repository = {
        id: repoId,
        organizationId: orgId,
        githubRepoId: dto.githubRepoId,
        name: dto.name,
        fullName: dto.fullName,
        defaultBranch: dto.defaultBranch || "main",
        branch,
        isPrivate: dto.isPrivate,
        indexStatus: "pending",
        lastIndexedAt: null,
        currentCommitSha: null,
        indexVersion: 1,
        createdAt: now,
        updatedAt: now,
      };

      devRepos.set(repoId, newRepo);
      orgService.setDevRepo(newRepo);
      return newRepo;
    }

    // Check duplicate in MongoDB
    const existing = await RepositoryModel.findOne({
      organizationId: new mongoose.Types.ObjectId(orgId),
      githubRepoId: dto.githubRepoId,
    });

    if (existing) {
      throw new Error("Repository is already connected to this organization");
    }

    const repo = await RepositoryModel.create({
      organizationId: new mongoose.Types.ObjectId(orgId),
      githubRepoId: dto.githubRepoId,
      name: dto.name,
      fullName: dto.fullName,
      defaultBranch: dto.defaultBranch || "main",
      branch,
      isPrivate: dto.isPrivate,
      indexStatus: "pending",
      indexVersion: 1,
      lastIndexedAt: null,
      currentCommitSha: null,
    });

    return repo.toClient();
  }

  /**
   * Lists all connected repositories for a given organization.
   */
  async listOrgRepos(orgId: string): Promise<Repository[]> {
    if (!isDbConnected()) {
      const results: Repository[] = [];
      for (const r of devRepos.values()) {
        if (r.organizationId === orgId) {
          results.push(r);
        }
      }
      return results;
    }

    const repos = await RepositoryModel.find({
      organizationId: new mongoose.Types.ObjectId(orgId),
    }).sort({ updatedAt: -1 });

    return repos.map((r) => r.toClient());
  }

  /**
   * Retrieves single repository by ID.
   */
  async getRepoById(repoId: string): Promise<Repository> {
    if (!isDbConnected()) {
      const repo = devRepos.get(repoId);
      if (!repo) throw new Error("Repository not found");
      return repo;
    }

    const repo = await RepositoryModel.findById(repoId);
    if (!repo) throw new Error("Repository not found");
    return repo.toClient();
  }

  /**
   * Triggers a manual re-index of the repository.
   * Increments indexVersion, updates indexStatus to "indexing".
   */
  async triggerReindex(repoId: string): Promise<Repository> {
    if (!isDbConnected()) {
      const repo = devRepos.get(repoId);
      if (!repo) throw new Error("Repository not found");
      const updated: Repository = {
        ...repo,
        indexStatus: "indexing",
        indexVersion: repo.indexVersion + 1,
        updatedAt: new Date().toISOString(),
      };
      devRepos.set(repoId, updated);
      orgService.setDevRepo(updated);
      return updated;
    }

    const repo = await RepositoryModel.findById(repoId);
    if (!repo) throw new Error("Repository not found");

    repo.indexStatus = "indexing";
    repo.indexVersion += 1;
    await repo.save();

    return repo.toClient();
  }

  /**
   * Cascading deletion: removes repository, chunks, files, and Qdrant vector embeddings.
   */
  async deleteRepo(repoId: string): Promise<void> {
    // 1. Cascading vector deletion in Qdrant
    await deleteRepoVectors(repoId);

    // 2. Cascading chunk deletion
    await chunkService.deleteRepoChunks(repoId);

    if (!isDbConnected()) {
      devRepos.delete(repoId);
      return;
    }

    // 3. In MongoDB, delete Repository document
    await RepositoryModel.deleteOne({ _id: new mongoose.Types.ObjectId(repoId) });

    console.log(`[RepoMind Repo] Repository ${repoId} and all associated records deleted.`);
  }

  setDevRepo(repo: Repository): void {
    devRepos.set(repo.id, repo);
    orgService.setDevRepo(repo);
  }
}

export const repoService = new RepoService();
