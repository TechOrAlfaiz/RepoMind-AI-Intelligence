import { Router } from "express";
import { orgController } from "./org.controller.js";
import { requireAuth, requireOrgRole } from "../../middlewares/auth.middleware.js";

const router = Router();

// All organization routes require authenticated user session
router.use(requireAuth);

router.post("/", (req, res) => orgController.createOrg(req, res));
router.get("/", (req, res) => orgController.listOrgs(req, res));

// Tenancy-protected routes
router.get("/:orgId", requireOrgRole("viewer"), (req, res) => orgController.getOrg(req, res));
router.post("/:orgId/members", requireOrgRole("admin"), (req, res) => orgController.addMember(req, res));
router.delete("/:orgId/members/:targetUserId", requireOrgRole("admin"), (req, res) =>
  orgController.removeMember(req, res),
);
router.post("/:orgId/join", (req, res) => orgController.joinOrg(req, res));

export const orgRouter = router;
