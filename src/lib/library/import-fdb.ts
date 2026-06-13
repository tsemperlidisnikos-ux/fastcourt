import { loadFastDrawModules } from "@/lib/fastdraw/load";
import type { FastDrawExportData } from "@/lib/fastdraw/types";
import { legacyPlayToStored } from "@/lib/library/convert";
import { putStoredPlays } from "@/lib/library/idb";
import type { FdbImportResult, StoredPlay } from "@/types/library";

export async function importFdbFile(
  file: File,
  options: { skipCandidates?: number; batchIndex?: number } = {},
): Promise<{ result: FdbImportResult; plays: StoredPlay[] }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const fastDraw = await loadFastDrawModules();
  const format = fastDraw.detectFormat(bytes);

  const exportData: FastDrawExportData = await fastDraw.parse(
    bytes,
    file.name,
    {
      maxPlays: fastDraw.DECODE_BATCH_SIZE,
      skipCandidates: options.skipCandidates ?? 0,
      batchIndex: options.batchIndex,
    },
  );

  const legacyPlays =
    exportData.playData?.sections?.flatMap((s) => s.plays ?? []) ?? [];

  const stored = legacyPlays.map((p) => legacyPlayToStored(p, "fdb-import"));
  if (stored.length) {
    await putStoredPlays(stored);
  }

  const meta = exportData.importMeta;
  const result: FdbImportResult = {
    imported: stored.length,
    skipped: Math.max(0, (meta?.remainingCandidates ?? 0)),
    hasMoreBatches: Boolean(meta?.hasMoreBatches),
    nextBatchSkip: meta?.nextBatchSkip ?? 0,
    batchIndex: meta?.batchIndex ?? 1,
    format,
    message:
      stored.length === 0
        ? "No plays decoded from this file."
        : `Imported ${stored.length} play(s) from ${file.name}.`,
  };

  return { result, plays: stored };
}

export async function analyzeFdbFile(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const fastDraw = await loadFastDrawModules();
  return fastDraw.analyze(bytes, file.name);
}
