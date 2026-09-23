import mongoose from "mongoose";
import { OrganizationModel, type IOrganizationDocument } from "./models/org.model.js";
import { MembershipModel, type IMembershipDocument } from "./models/membership.model.js";
import { RepositoryModel } from "../repos/models/repo.model.js";
import { UserModel } from "../auth/models/user.model.js";
import { isDbConnected } from "../../config/database.js";
import type {
  Organization,
  Membership,
  OrgRole,
  OrgWithRole,
  MembershipWithUser,
  Repository,
} from "@repomind/shared-types";

// In-memory fallback stores for offline local development
const devOrgs = new Map<string, Organization>();
const devMemberships = new Map<string, Membership>();
const devRepos = new Map<string, Repository>();

export class OrgService {
  /**
   * Generates a URL-friendly slug from an organization name.
   */
  slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /**
   * Creates a new Organization and assigns the creator as "owner".
   */
  async createOrganization(userId: string, name: string, customSlug?: string): Promise<OrgWithRole> {
    const slugBase = customSlug ? this.slugify(customSlug) : this.slugify(name);
    const uniqueSlug = `${slugBase}-${Math.random().toString(36).substring(2, 6)}`;

    if (!isDbConnected()) {
      const orgId = `org_${Date.now()}`;
      const now = new Date().toISOString();
      const org: Organization = {
        id: orgId,
        name,
        slug: uniqueSlug,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      };
      devOrgs.set(orgId, org);

      const membershipId = `mem_${Date.now()}`;
      const membership: Membership = {
        id: membershipId,
        userId,
        organizationId: orgId,
        role: "owner",
        createdAt: now,
      };
      devMemberships.set(`${userId}:${orgId}`, membership);

      return {
        ...org,
        userRole: "owner",
        memberCount: 1,
        repoCount: 0,
      };
    }

    // Use session/atomic logic for Mongo
    const org = await OrganizationModel.create({
      name,
      slug: uniqueSlug,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    await MembershipModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: org._id,
      role: "owner",
    });

    return {
      ...org.toClient(),
      userRole: "owner",
      memberCount: 1,
      repoCount: 0,
    };
  }

  /**
   * Retrieves all organizations that the user belongs to, including their role.
   */
  async getUserOrganizations(userId: string): Promise<OrgWithRole[]> {
    if (!isDbConnected()) {
      const results: OrgWithRole[] = [];
      for (const mem of devMemberships.values()) {
        if (mem.userId === userId) {
          const org = devOrgs.get(mem.organizationId);
          if (org) {
            results.push({
              ...org,
              userRole: mem.role,
              memberCount: 1,
              repoCount: 0,
            });
          }
        }
      }
      return results;
    }

    const memberships = await MembershipModel.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();

    if (memberships.length === 0) {
      try {
        const defaultOrg = await this.createOrganization(userId, "My Workspace", "my-workspace");
        return [defaultOrg];
      } catch (err) {
        console.error("[RepoMind Org] Failed to auto-create default org:", err);
      }
    }

    const orgIds = memberships.map((m) => m.organizationId);
    const orgs = await OrganizationModel.find({ _id: { $in: orgIds } });

    const orgMap = new Map(orgs.map((o) => [o._id.toString(), o.toClient()]));

    return memberships
      .map((m) => {
        const org = orgMap.get(m.organizationId.toString());
        if (!org) return null;
        return {
          ...org,
          userRole: m.role,
        };
      })
      .filter((o): o is OrgWithRole => o !== null);
  }

  /**
   * Retrieves an organization by ID with its members list and repositories count.
   */
  async getOrgDetails(orgId: string, userId: string): Promise<{
    organization: Organization;
    userRole: OrgRole;
    members: MembershipWithUser[];
    repoCount: number;
  }> {
    if (!isDbConnected()) {
      const org = devOrgs.get(orgId);
      if (!org) throw new Error("Organization not found");
      const callerMem = devMemberships.get(`${userId}:${orgId}`);
      if (!callerMem) throw new Error("Caller is not a member of this organization");

      const members: MembershipWithUser[] = [];
      for (const m of devMemberships.values()) {
        if (m.organizationId === orgId) {
          members.push({
            ...m,
            user: {
              id: m.userId,
              username: "dev-architect",
              displayName: "Dev Architect",
              avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
              email: "architect@repomind.local",
            },
          });
        }
      }

      return {
        organization: org,
        userRole: callerMem.role,
        members,
        repoCount: 0,
      };
    }

    const org = await OrganizationModel.findById(orgId);
    if (!org) throw new Error("Organization not found");

    const callerMem = await MembershipModel.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      organizationId: org._id,
    });
    if (!callerMem) throw new Error("Caller is not a member of this organization");

    const membershipDocs = await MembershipModel.find({ organizationId: org._id })
      .populate<{ userId: any }>("userId", "username displayName avatarUrl email")
      .lean();

    const members: MembershipWithUser[] = membershipDocs.map((m: any) => ({
      id: m._id.toString(),
      userId: m.userId?._id?.toString() || m.userId?.toString(),
      organizationId: m.organizationId.toString(),
      role: m.role,
      createdAt: m.createdAt?.toISOString() || new Date().toISOString(),
      user: {
        id: m.userId?._id?.toString() || m.userId?.toString(),
        username: m.userId?.username || "unknown",
        displayName: m.userId?.displayName || null,
        avatarUrl: m.userId?.avatarUrl || null,
        email: m.userId?.email || null,
      },
    }));

    const repoCount = await RepositoryModel.countDocuments({ organizationId: org._id });

    return {
      organization: org.toClient(),
      userRole: callerMem.role,
      members,
      repoCount,
    };
  }

  /**
   * Adds or updates a member in an organization.
   */
  async addMember(orgId: string, targetUserId: string, role: OrgRole): Promise<Membership> {
    if (!isDbConnected()) {
      const membership: Membership = {
        id: `mem_${Date.now()}`,
        userId: targetUserId,
        organizationId: orgId,
        role,
        createdAt: new Date().toISOString(),
      };
      devMemberships.set(`${targetUserId}:${orgId}`, membership);
      return membership;
    }

    const updated = await MembershipModel.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(targetUserId),
        organizationId: new mongoose.Types.ObjectId(orgId),
      },
      { role },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    return updated.toClient();
  }

  /**
   * Removes a member from an organization, ensuring the organization retains at least one owner.
   */
  async removeMember(orgId: string, targetUserId: string): Promise<void> {
    if (!isDbConnected()) {
      const key = `${targetUserId}:${orgId}`;
      const mem = devMemberships.get(key);
      if (mem?.role === "owner") {
        let ownerCount = 0;
        for (const m of devMemberships.values()) {
          if (m.organizationId === orgId && m.role === "owner") ownerCount++;
        }
        if (ownerCount <= 1) {
          throw new Error("Cannot remove the only owner of the organization");
        }
      }
      devMemberships.delete(key);
      return;
    }

    const mem = await MembershipModel.findOne({
      userId: new mongoose.Types.ObjectId(targetUserId),
      organizationId: new mongoose.Types.ObjectId(orgId),
    });

    if (!mem) return;

    if (mem.role === "owner") {
      const ownerCount = await MembershipModel.countDocuments({
        organizationId: new mongoose.Types.ObjectId(orgId),
        role: "owner",
      });
      if (ownerCount <= 1) {
        throw new Error("Cannot remove the only owner of the organization");
      }
    }

    await MembershipModel.deleteOne({ _id: mem._id });
  }

  // --- Development Helper Methods ---
  getDevMembership(userId: string, orgId: string): Membership | null {
    return devMemberships.get(`${userId}:${orgId}`) || null;
  }

  setDevMembership(userId: string, orgId: string, role: OrgRole): void {
    devMemberships.set(`${userId}:${orgId}`, {
      id: `mem_${Date.now()}_${Math.random()}`,
      userId,
      organizationId: orgId,
      role,
      createdAt: new Date().toISOString(),
    });
  }

  getDevOrg(orgId: string): Organization | null {
    return devOrgs.get(orgId) || null;
  }

  setDevOrg(org: Organization): void {
    devOrgs.set(org.id, org);
  }

  getDevRepo(repoId: string): Repository | null {
    return devRepos.get(repoId) || null;
  }

  setDevRepo(repo: Repository): void {
    devRepos.set(repo.id, repo);
  }
}

export const orgService = new OrgService();
