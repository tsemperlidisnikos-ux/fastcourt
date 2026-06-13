import type { Role } from "@/lib/config";

export type AccessType = "trial" | "subscription" | "unlimited";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  accessType: AccessType;
  expiresAt: string | null;
}

export interface AuthSession {
  user: SessionUser;
  createdAt: string;
  cloud?: boolean;
}

export type OAuthProvider = "google" | "apple" | "facebook";
