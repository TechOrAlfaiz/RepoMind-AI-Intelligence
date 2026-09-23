export type OrgRole = "owner" | "admin" | "member" | "viewer";

export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 40,
  admin: 30,
  member: 20,
  viewer: 10,
};

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  role: OrgRole;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOrgDTO {
  name: string;
  slug?: string;
}

export interface AddMemberDTO {
  userId?: string;
  usernameOrEmail?: string;
  role: OrgRole;
}

export interface OrgWithRole extends Organization {
  userRole: OrgRole;
  memberCount?: number;
  repoCount?: number;
}

export interface MembershipWithUser extends Membership {
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    email: string | null;
  };
}

