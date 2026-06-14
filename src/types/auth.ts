import type { Role } from "@/lib/config";
import type { OrgMemberRole } from "@/types/team-org";

export type AccessType = "trial" | "subscription" | "unlimited";
export type AccessSource = "personal" | "organization";
export type OrgMemberKind = OrgMemberRole | "team_admin";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  accessType: AccessType;
  expiresAt: string | null;
  organizationId?: string;
  organizationName?: string;
  orgMemberRole?: OrgMemberKind;
  accessSource?: AccessSource;
}

export interface AuthSession {
  user: SessionUser;
  createdAt: string;
  cloud?: boolean;
}

export type OAuthProvider = "google" | "apple" | "facebook";
