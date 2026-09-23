import { Router } from "express";
import { repoController } from "./repo.controller.js";
import { requireAuth, requireOrgRole, requireRepoAccess } from "../../middlewares/auth.middleware.js";

const router = Router();

// All repository routes require authenticated user session
router.use(requireAuth);

// GitHub repository discovery
router.get("/github", (req, res) => repoController.listGitHubRepos(req, res));

// Connect repository to an organization (requires admin role)
router.post("/connect", requireOrgRole("admin"), (req, res) => repoController.connectRepo(req, res));

// List repositories in an organization (requires viewer role)
router.get("/", requireOrgRole("viewer"), (req, res) => repoController.listOrgRepos(req, res));

// Operations on a specific repository (strictly tenant-guarded)
router.get("/:repoId", requireRepoAccess("viewer"), (req, res) => repoController.getRepo(req, res));
router.get("/:repoId/files", requireRepoAccess("viewer"), (req, res) => repoController.getRepoFiles(req, res));
router.get("/:repoId/file-content", requireRepoAccess("viewer"), (req, res) => repoController.getFileContent(req, res));
router.get("/:repoId/chunks", requireRepoAccess("viewer"), (req, res) => repoController.getRepoChunks(req, res));
router.post("/:repoId/retrieve", requireRepoAccess("viewer"), (req, res) => repoController.retrieveChunks(req, res));
router.post("/:repoId/retrieve-hybrid", requireRepoAccess("viewer"), (req, res) => repoController.retrieveHybrid(req, res));
router.post("/:repoId/evaluate", requireRepoAccess("viewer"), (req, res) => repoController.runEvaluationBenchmark(req, res));
router.post("/:repoId/index", requireRepoAccess("admin"), (req, res) => repoController.triggerReindex(req, res));
router.delete("/:repoId", requireRepoAccess("admin"), (req, res) => repoController.deleteRepo(req, res));

export const repoRouter = router;
