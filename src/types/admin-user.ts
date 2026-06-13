import type { Role } from "@/lib/config";
import type { AccessType } from "@/types/auth";

export interface AdminUserRecord {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  accessType: AccessType;
  expiresAt: string | null;
  createdAt: string;
  organization?: string;
  signupComplete?: boolean;
  trialDays?: number;
}

export type AdminUserDraft = AdminUserRecord & {
  expiryDate?: string;
  expiryTime?: string;
};
