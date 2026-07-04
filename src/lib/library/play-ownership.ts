import type { SessionUser } from "@/types/auth";
import type { StoredPlay } from "@/types/library";
import { usesOrganizationSharedLibrary } from "@/lib/cloud/library-owner";

/** Solo libraries filter by owner; org coaches see the full shared team row. */
export function usesPersonalPlayOwnership(
  user: SessionUser,
  libraryOwnerUserId: string,
): boolean {
  if (usesOrganizationSharedLibrary(user, libraryOwnerUserId)) return false;
  return user.id === libraryOwnerUserId;
}

export function playOwnedBySessionUser(
  play: StoredPlay,
  user: SessionUser,
): boolean {
  if (!play.ownerUserId || play.ownerUserId !== user.id) return false;

  const email = user.email.trim().toLowerCase();
  if (play.ownerEmail && play.ownerEmail.toLowerCase() !== email) return false;

  return true;
}

export function filterPlaysForLibraryScope(
  plays: StoredPlay[],
  user: SessionUser,
  libraryOwnerUserId: string,
): StoredPlay[] {
  if (!usesPersonalPlayOwnership(user, libraryOwnerUserId)) return plays;
  return plays.filter((play) => playOwnedBySessionUser(play, user));
}

export function stampPlayOwner(play: StoredPlay, user: SessionUser): StoredPlay {
  const email = user.email.trim().toLowerCase();
  return {
    ...play,
    ownerUserId: play.ownerUserId ?? user.id,
    ownerEmail: play.ownerEmail ?? email,
    ownerDisplayName:
      play.ownerDisplayName?.trim() || user.displayName?.trim() || email,
  };
}
