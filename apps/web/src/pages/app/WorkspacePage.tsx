import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell, type AppShellRepo } from "../../components/shell/AppShell";
import { useRepo } from "../../context/RepoContext";
import { useOrg } from "../../context/OrgContext";

export const WorkspacePage: React.FC = () => {
  const { repositories } = useRepo();
  const { activeOrg } = useOrg();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  // Find repository if id is provided, or pick the first available repository
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(id || null);

  const activeRepository =
    repositories.find((r) => r.id === (selectedRepoId || id)) ||
    (repositories.length > 0 ? repositories[0] : null);

  const shellRepos: AppShellRepo[] = repositories.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.fullName,
    branch: r.branch,
    indexStatus:
      r.indexStatus === "indexed"
        ? "ready"
        : r.indexStatus === "indexing"
        ? "indexing"
        : r.indexStatus === "failed"
        ? "error"
        : "pending",
  }));

  const primaryRepo: AppShellRepo = activeRepository
    ? {
        id: activeRepository.id,
        name: activeRepository.name,
        fullName: activeRepository.fullName,
        branch: activeRepository.branch,
        indexStatus:
          activeRepository.indexStatus === "indexed"
            ? "ready"
            : activeRepository.indexStatus === "indexing"
            ? "indexing"
            : activeRepository.indexStatus === "failed"
            ? "error"
            : "pending",
      }
    : {
        id: "repo_dev_primary",
        name: "repomind-core",
        fullName: "TechOrAlfaiz/repomind-core",
        branch: "main",
        indexStatus: "ready",
      };

  return (
    <div className="h-[calc(100vh-3.5rem)] w-full overflow-hidden">
      <AppShell
        repo={primaryRepo}
        repositories={shellRepos}
        onSelectRepo={(repoId: string) => {
          setSelectedRepoId(repoId);
        }}
        onConnectNewRepo={() => {
          navigate("/app/repositories");
        }}
        organizationId={activeOrg?.id}
        onExitShell={() => navigate("/app/dashboard")}
        onOpenShowcase={() => navigate("/")}
      />
    </div>
  );
};
