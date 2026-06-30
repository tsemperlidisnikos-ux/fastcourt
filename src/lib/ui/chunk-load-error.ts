export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk [\s\S]+ failed/i.test(error.message)
  );
}

/** One automatic full reload per tab session after stale webpack chunks. */
export function tryRecoverFromChunkLoadError(error: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false;
  const key = "fc-chunk-reload-once";
  if (sessionStorage.getItem(key)) return false;
  sessionStorage.setItem(key, "1");
  window.location.reload();
  return true;
}
