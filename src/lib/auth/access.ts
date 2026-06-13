import type { SessionUser } from "@/types/auth";
import { hasFullAccess } from "@/lib/auth/roles";

export function getAccessError(user: SessionUser | null): string | null {
  if (!user || hasFullAccess(user)) return null;
  if (!user.expiresAt) return null;
  if (new Date(user.expiresAt).getTime() < Date.now()) {
    return "Your free trial has ended. Subscribe to continue using FastCourt.";
  }
  return null;
}
