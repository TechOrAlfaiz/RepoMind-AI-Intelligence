import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type {
  Repository,
  GitHubRepoListItem,
  ConnectRepoDTO,
  FileRecord,
  ChunkRecord,
  RetrievedChunk,
  ScoringWeights,
  EvaluationBenchmarkResult,
  HybridRetrievalResponse,
} from "@repomind/shared-types";
import { useOrg } from "./OrgContext";
import { useAuth } from "./AuthContext";

interface RepoContextType {
  repositories: Repository[];
  githubRepos: GitHubRepoListItem[];
  activeRepo: Repository | null;
  loading: boolean;
  connecting: boolean;
  setActiveRepo: (repo: Repository | null) => void;
  connectRepo: (dto: Omit<ConnectRepoDTO, "organizationId">) => Promise<Repository | null>;
  triggerReindex: (repoId: string) => Promise<void>;
  deleteRepo: (repoId: string) => Promise<void>;
  fetchGitHubRepos: () => Promise<void>;
  fetchRepoFiles: (repoId: string) => Promise<FileRecord[]>;
  fetchRepoChunks: (repoId: string) => Promise<ChunkRecord[]>;
  retrieveRepoChunks: (repoId: string, query: string, limit?: number) => Promise<RetrievedChunk[]>;
  retrieveHybridChunks: (
    repoId: string,
    query: string,
    limit?: number,
    weights?: Partial<ScoringWeights>,
  ) => Promise<HybridRetrievalResponse | null>;
  runEvaluationBenchmark: (
    repoId: string,
    weights?: Partial<ScoringWeights>,
  ) => Promise<EvaluationBenchmarkResult | null>;
  fetchFileContent: (repoId: string, path: string) => Promise<{ path: string; content: string; language: string; commitSha?: string } | null>;
  refreshRepos: () => Promise<void>;
}

const RepoContext = createContext<RepoContextType | undefined>(undefined);

export const RepoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeOrg } = useOrg();
  const { isAuthenticated } = useAuth();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [githubRepos, setGithubRepos] = useState<GitHubRepoListItem[]>([]);
  const [activeRepo, setActiveRepo] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchConnectedRepos = useCallback(async () => {
    if (!isAuthenticated || !activeOrg) {
      setRepositories([]);
      setActiveRepo(null);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/repos?organizationId=${activeOrg.id}`, {
        credentials: "include",
        headers: { "x-organization-id": activeOrg.id },
      });
      if (res.ok) {
        const data = await res.json();
        const repos: Repository[] = data.repositories || [];
        const demoRepo: Repository = {
          id: "repomind-core",
          organizationId: activeOrg.id,
          githubRepoId: 999999,
          name: "repomind-core",
          fullName: "repomind/repomind-core",
          defaultBranch: "main",
          branch: "main",
          isPrivate: false,
          indexStatus: "indexed",
          currentCommitSha: "a1b2c3d4e5f6",
          indexVersion: 1,
          lastIndexedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const finalRepos = repos.length > 0 ? repos : [demoRepo];
        setRepositories(finalRepos);
        if (!activeRepo) {
          setActiveRepo(finalRepos[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch connected repositories:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeOrg, activeRepo]);

  const fetchGitHubRepos = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetch("/api/repos/github", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setGithubRepos(data.repositories || []);
      }
    } catch (err) {
      console.error("Failed to fetch GitHub repos:", err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchConnectedRepos();
  }, [fetchConnectedRepos]);

  const connectRepo = async (dto: Omit<ConnectRepoDTO, "organizationId">): Promise<Repository | null> => {
    if (!activeOrg) return null;
    setConnecting(true);

    try {
      const res = await fetch("/api/repos/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": activeOrg.id,
        },
        credentials: "include",
        body: JSON.stringify({
          ...dto,
          organizationId: activeOrg.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newRepo: Repository = data.repository;
        setRepositories((prev) => [newRepo, ...prev]);
        setActiveRepo(newRepo);
        return newRepo;
      }
    } catch (err) {
      console.error("Failed to connect repository:", err);
    } finally {
      setConnecting(false);
    }
    return null;
  };

  const triggerReindex = async (repoId: string): Promise<void> => {
    if (!activeOrg) return;

    try {
      const res = await fetch(`/api/repos/${repoId}/index`, {
        method: "POST",
        headers: { "x-organization-id": activeOrg.id },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        const updated: Repository = data.repository;
        setRepositories((prev) => prev.map((r) => (r.id === repoId ? updated : r)));
        if (activeRepo?.id === repoId) setActiveRepo(updated);
      }
    } catch (err) {
      console.error("Failed to trigger re-index:", err);
    }
  };

  const deleteRepo = async (repoId: string): Promise<void> => {
    if (!activeOrg) return;

    try {
      const res = await fetch(`/api/repos/${repoId}`, {
        method: "DELETE",
        headers: { "x-organization-id": activeOrg.id },
        credentials: "include",
      });

      if (res.ok) {
        setRepositories((prev) => prev.filter((r) => r.id !== repoId));
        if (activeRepo?.id === repoId) setActiveRepo(null);
      }
    } catch (err) {
      console.error("Failed to delete repository:", err);
    }
  };

  const fetchRepoFiles = async (repoId: string): Promise<FileRecord[]> => {
    if (!activeOrg) return [];

    try {
      const res = await fetch(`/api/repos/${repoId}/files`, {
        headers: { "x-organization-id": activeOrg.id },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        return data.files || [];
      }
    } catch (err) {
      console.error("Failed to fetch repository files:", err);
    }
    return [];
  };

  const fetchRepoChunks = async (repoId: string): Promise<ChunkRecord[]> => {
    if (!activeOrg) return [];

    try {
      const res = await fetch(`/api/repos/${repoId}/chunks`, {
        headers: { "x-organization-id": activeOrg.id },
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        return data.chunks || [];
      }
    } catch (err) {
      console.error("Failed to fetch repository chunks:", err);
    }
    return [];
  };

  const retrieveRepoChunks = async (
    repoId: string,
    query: string,
    limit = 8,
  ): Promise<RetrievedChunk[]> => {
    if (!activeOrg) return [];

    try {
      const res = await fetch(`/api/repos/${repoId}/retrieve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": activeOrg.id,
        },
        credentials: "include",
        body: JSON.stringify({ query, limit }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.results || [];
      }
    } catch (err) {
      console.error("Failed to retrieve repository chunks:", err);
    }
    return [];
  };

  const retrieveHybridChunks = async (
    repoId: string,
    query: string,
    limit: number = 8,
    weights?: Partial<ScoringWeights>,
  ): Promise<HybridRetrievalResponse | null> => {
    if (!activeOrg) return null;

    try {
      const res = await fetch(`/api/repos/${repoId}/retrieve-hybrid`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": activeOrg.id,
        },
        credentials: "include",
        body: JSON.stringify({ query, limit, weights }),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("Failed to execute hybrid retrieval:", err);
    }
    return null;
  };

  const runEvaluationBenchmark = async (
    repoId: string,
    weights?: Partial<ScoringWeights>,
  ): Promise<EvaluationBenchmarkResult | null> => {
    if (!activeOrg) return null;

    try {
      const res = await fetch(`/api/repos/${repoId}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": activeOrg.id,
        },
        credentials: "include",
        body: JSON.stringify({ weights }),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("Failed to run evaluation benchmark:", err);
    }
    return null;
  };

  const fetchFileContent = async (
    repoId: string,
    path: string,
  ): Promise<{ path: string; content: string; language: string; commitSha?: string } | null> => {
    if (!activeOrg) return null;

    try {
      const res = await fetch(`/api/repos/${repoId}/file-content?path=${encodeURIComponent(path)}`, {
        headers: { "x-organization-id": activeOrg.id },
        credentials: "include",
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.error("Failed to fetch file content:", err);
    }
    return null;
  };

  return (
    <RepoContext.Provider
      value={{
        repositories,
        githubRepos,
        activeRepo,
        loading,
        connecting,
        setActiveRepo,
        connectRepo,
        triggerReindex,
        deleteRepo,
        fetchGitHubRepos,
        fetchRepoFiles,
        fetchRepoChunks,
        retrieveRepoChunks,
        retrieveHybridChunks,
        runEvaluationBenchmark,
        fetchFileContent,
        refreshRepos: fetchConnectedRepos,
      }}
    >
      {children}
    </RepoContext.Provider>
  );
};

export function useRepo() {
  const context = useContext(RepoContext);
  if (!context) {
    throw new Error("useRepo must be used within a RepoProvider");
  }
  return context;
}
