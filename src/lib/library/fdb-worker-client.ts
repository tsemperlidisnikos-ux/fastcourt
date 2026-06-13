import { importFdbFile } from "@/lib/library/import-fdb";
import { importFdbLazy } from "@/lib/library/fdb-lazy";
import type { FdbImportResult, StoredPlay } from "@/types/library";

export type FdbImportMode = "full" | "lazy";

/** Chunked main-thread import with progress (worker-ready hook point). */
export async function importFdbWithProgress(
  file: File,
  options: {
    skipCandidates?: number;
    batchIndex?: number;
    mode?: FdbImportMode;
  } = {},
  onProgress?: (pct: number, message: string) => void,
): Promise<{ result: FdbImportResult; plays: StoredPlay[] }> {
  onProgress?.(8, "Reading file…");
  await new Promise((r) => setTimeout(r, 0));

  if (options.mode === "lazy") {
    onProgress?.(25, "Indexing plays (lazy)…");
    const out = await importFdbLazy(file);
    onProgress?.(100, out.result.message ?? "Done");
    return out;
  }

  onProgress?.(30, "Decoding diagrams…");
  const out = await importFdbFile(file, options);
  onProgress?.(100, out.result.message ?? "Done");
  return out;
}
