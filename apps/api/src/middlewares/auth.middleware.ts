import type { Request, Response, NextFunction } from "express";
import { authService } from "../modules/auth/auth.service.js";
import { MembershipModel } from "../modules/orgs/models/membership.model.js";
import { OrganizationModel } from "../modules/orgs/models/org.model.js";
import { RepositoryModel } from "../modules/repos/models/repo.model.js";
import { isDbConnected } from "../config/database.js";
import { orgService } from "../modules/orgs/org.service.js";
import {
  type OrgRole,
  type SessionUser,
  type Membership,
  type Organization,
  type Repository,
  ROLE_HIERARCHY,
} from "@repomind/shared-types";

// Augment Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      membership?: Membership;
      organization?: Organization;
      repository?: Repository;
    }
  }
}

import { resolveUserId, clearAuthCookies } from "../utils/session.js";

/**
 * Ensures request has an authenticated session. Attaches req.user.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = resolveUserId(req);

  if (!userId) {
    res.status(401).json({
      error: "Authentication required",
      code: "UNAUTHORIZED",
    });
    return;
  }

  try {
    const user = await authService.getUserSessionById(userId);
    if (!user) {
      clearAuthCookies(res);
      if (req.session) {
        req.session.destroy(() => {});
      }
      res.status(401).json({
        error: "Session expired or invalid",
        code: "UNAUTHORIZED",
      });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(500).json({ error: "Failed to authenticate session" });
  }
}

/**
 * Middleware factory ensuring the caller has at least `minRole` in the target organization.
 */
export function requireOrgRole(minRole: OrgRole = "viewer") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
      return;
    }

    let orgId =
      req.params.orgId ||
      req.body.organizationId ||
      req.body.orgId ||
      (req.query.orgId as string) ||
      (req.query.organizationId as string) ||
      (req.headers["x-organization-id"] as string);

    if (!orgId) {
      try {
        const userOrgs = await orgService.getUserOrganizations(req.user.id);
        if (userOrgs && userOrgs.length > 0) {
          orgId = userOrgs[0].id;
        }
      } catch (_) {}
    }

    if (!orgId) {
      res.status(400).json({
        error: "Organization identifier required in params, body, or x-organization-id header",
        code: "MISSING_ORG_ID",
      });
      return;
    }

    try {
      // Check in-memory store if offline dev or query database
      let membership: Membership | null = null;
      let organization: Organization | null = null;

      if (!isDbConnected()) {
        membership = orgService.getDevMembership(req.user.id, orgId);
        organization = orgService.getDevOrg(orgId);
      } else {
        const memDoc = await MembershipModel.findOne({
          userId: req.user.id,
          organizationId: orgId,
        });
        if (memDoc) {
          membership = memDoc.toClient();
          const orgDoc = await OrganizationModel.findById(orgId);
          if (orgDoc) organization = orgDoc.toClient();
        }
      }

      if (!membership || !organization) {
        res.status(403).json({
          error: "Forbidden: You are not a member of this organization",
          code: "NOT_A_MEMBER",
        });
        return;
      }

      // Check role hierarchy
      const callerRoleRank = ROLE_HIERARCHY[membership.role] || 0;
      const requiredRoleRank = ROLE_HIERARCHY[minRole] || 0;

      if (callerRoleRank < requiredRoleRank) {
        res.status(403).json({
          error: `Forbidden: Action requires minimum role of '${minRole}', your role is '${membership.role}'`,
          code: "INSUFFICIENT_PERMISSIONS",
        });
        return;
      }

      req.membership = membership;
      req.organization = organization;
      next();
    } catch (err: any) {
      res.status(500).json({ error: "Failed to authorize organization access" });
    }
  };
}

/**
 * Middleware ensuring the caller has authorized access to a specific Repository.
 */
export function requireRepoAccess(minRole: OrgRole = "viewer") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required", code: "UNAUTHORIZED" });
      return;
    }

    const repoId =
      req.params.repoId ||
      req.params.id ||
      req.body.repositoryId ||
      req.body.repoId ||
      (req.query.repoId as string);

    if (!repoId) {
      res.status(400).json({ error: "Repository identifier required", code: "MISSING_REPO_ID" });
      return;
    }

    try {
      let repo: Repository | null = null;

      if (!isDbConnected()) {
        repo = orgService.getDevRepo(repoId);
      } else {
        const repoDoc = await RepositoryModel.findById(repoId);
        if (repoDoc) repo = repoDoc.toClient();
      }

      if (!repo) {
        res.status(404).json({ error: "Repository not found", code: "REPO_NOT_FOUND" });
        return;
      }

      // Verify caller's membership in the repository's organization
      let membership: Membership | null = null;
      let organization: Organization | null = null;

      if (!isDbConnected()) {
        membership = orgService.getDevMembership(req.user.id, repo.organizationId);
        organization = orgService.getDevOrg(repo.organizationId);
      } else {
        const memDoc = await MembershipModel.findOne({
          userId: req.user.id,
          organizationId: repo.organizationId,
        });
        if (memDoc) {
          membership = memDoc.toClient();
          const orgDoc = await OrganizationModel.findById(repo.organizationId);
          if (orgDoc) organization = orgDoc.toClient();
        }
      }

      if (!membership || !organization) {
        res.status(403).json({
          error: "Forbidden: Access to repository denied (not an organization member)",
          code: "REPO_ACCESS_DENIED",
        });
        return;
      }

      const callerRoleRank = ROLE_HIERARCHY[membership.role] || 0;
      const requiredRoleRank = ROLE_HIERARCHY[minRole] || 0;

      if (callerRoleRank < requiredRoleRank) {
        res.status(403).json({
          error: `Forbidden: Repository action requires minimum role of '${minRole}'`,
          code: "INSUFFICIENT_REPO_PERMISSIONS",
        });
        return;
      }

      req.repository = repo;
      req.organization = organization;
      req.membership = membership;
      next();
    } catch (err: any) {
      res.status(500).json({ error: "Failed to authorize repository access" });
    }
  };
}
