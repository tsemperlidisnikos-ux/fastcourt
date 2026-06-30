let activeLibraryScopeId: string | null = null;

export function getLibraryDbScopeId(): string | null {
  return activeLibraryScopeId;
}

export function setLibraryDbScopeId(scopeId: string | null): void {
  const next = scopeId?.trim() || null;
  if (activeLibraryScopeId === next) return;
  activeLibraryScopeId = next;
}

export function clearLibraryDbScope(): void {
  activeLibraryScopeId = null;
}

export function libraryDbNameForScope(scopeId: string): string {
  const safe = scopeId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `fastcourt_library_v2_${safe}`;
}
