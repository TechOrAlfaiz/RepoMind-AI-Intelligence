import type { Request, Response } from "express";
import { orgService } from "./org.service.js";
import type { OrgRole } from "@repomind/shared-types";

export class OrgController {
  /**
   * POST /api/orgs
   * Creates a new organization and grants caller 'owner' role.
   */
  async createOrg(req: Request, res: Response): Promise<void> {
    const { name, slug } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Organization name is required" });
      return;
    }

    try {
      const org = await orgService.createOrganization(req.user!.id, name.trim(), slug);
      res.status(201).json({ organization: org });
    } catch (err: any) {
      console.error("[RepoMind Org] Create org failed:", err.message);
      res.status(500).json({ error: err.message || "Failed to create organization" });
    }
  }

  /**
   * GET /api/orgs
   * Lists all organizations the caller belongs to.
   */
  async listOrgs(req: Request, res: Response): Promise<void> {
    try {
      const orgs = await orgService.getUserOrganizations(req.user!.id);
      res.status(200).json({ organizations: orgs });
    } catch (err: any) {
      console.error("[RepoMind Org] List orgs failed:", err.message);
      res.status(500).json({ error: "Failed to fetch organizations" });
    }
  }

  /**
   * GET /api/orgs/:orgId
   * Retrieves organization details and member roster (requires membership).
   */
  async getOrg(req: Request, res: Response): Promise<void> {
    const orgId = String(req.params.orgId);

    try {
      const details = await orgService.getOrgDetails(orgId, req.user!.id);
      res.status(200).json(details);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to load organization details" });
    }
  }

  /**
   * POST /api/orgs/:orgId/members
   * Adds or updates a member's role (requires admin or owner).
   */
  async addMember(req: Request, res: Response): Promise<void> {
    const orgId = String(req.params.orgId);
    const { userId, role } = req.body as { userId: string; role: OrgRole };

    if (!userId || !role) {
      res.status(400).json({ error: "Both userId and role ('owner'|'admin'|'member'|'viewer') are required" });
      return;
    }

    const validRoles: OrgRole[] = ["owner", "admin", "member", "viewer"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: "Invalid role specified" });
      return;
    }

    try {
      const membership = await orgService.addMember(orgId, userId, role);
      res.status(200).json({ membership });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to add member" });
    }
  }

  /**
   * DELETE /api/orgs/:orgId/members/:targetUserId
   * Removes a member from the organization (requires admin or owner).
   */
  async removeMember(req: Request, res: Response): Promise<void> {
    const orgId = String(req.params.orgId);
    const targetUserId = String(req.params.targetUserId);

    try {
      await orgService.removeMember(orgId, targetUserId);
      res.status(200).json({ message: "Member removed successfully" });
    } catch (err: any) {
      res.status(400).json({ error: err.message || "Failed to remove member" });
    }
  }

  /**
   * POST /api/orgs/:orgId/join
   * Allows authenticated user to join an organization.
   */
  async joinOrg(req: Request, res: Response): Promise<void> {
    const orgId = String(req.params.orgId);

    try {
      const membership = await orgService.addMember(orgId, req.user!.id, "member");
      res.status(200).json({ message: "Joined organization successfully", membership });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to join organization" });
    }
  }
}

export const orgController = new OrgController();
