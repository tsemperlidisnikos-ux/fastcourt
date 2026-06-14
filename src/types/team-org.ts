import type { OrgBrandingSettings } from "@/types/org-branding";

export type OrgMemberRole = "coach" | "player";
export type OrgMemberStatus = "active" | "invited" | "disabled";

export interface OrgMember {
  id: string;
  email: string;
  role: OrgMemberRole;
  status: OrgMemberStatus;
  inviteToken?: string;
}

export interface TeamOrganization {
  id: string;
  name: string;
  teamAdminEmail: string;
  teamAdminInviteToken?: string;
  coachSeats: number;
  expiresAt: string | null;
  createdAt: string;
  coaches: OrgMember[];
  players: OrgMember[];
  branding?: OrgBrandingSettings;
}
