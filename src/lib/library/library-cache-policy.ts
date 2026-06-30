export function isCloudSessionUserId(userId: string) {
  return !userId.startsWith("local-") && !userId.startsWith("demo-");
}

export function shouldResetLibraryCache(
  prevSessionUserId: string | null,
  prevOwnerUserId: string | null,
  sessionUserId: string,
  libraryOwnerUserId: string,
): boolean {
  if (prevSessionUserId !== null && prevSessionUserId !== sessionUserId) return true;
  if (prevOwnerUserId !== null && prevOwnerUserId !== libraryOwnerUserId) return true;
  return false;
}

/** Cloud login with no cache marker but local plays — likely another account on this browser. */
export function shouldClearUntrustedLocalLibrary(
  prevSessionUserId: string | null,
  sessionUserId: string,
  localPlayCount: number,
): boolean {
  if (localPlayCount <= 0) return false;
  if (!isCloudSessionUserId(sessionUserId)) return false;
  return prevSessionUserId === null || prevSessionUserId !== sessionUserId;
}
