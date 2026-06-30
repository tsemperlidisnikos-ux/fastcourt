import { loadFastDrawModules } from "@/lib/fastdraw/load";
import { legacyPlayToStored } from "@/lib/library/convert";
import { putStoredPlays } from "@/lib/library/idb";
import type { FdbImportResult, StoredPlay } from "@/types/library";

const FDB_SOURCE_CACHE_MAX_BYTES = 5_000_000;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]!);
    }
  }
  return btoa(binary);
}

export interface FdbLazyMeta {
  sourceId: string;
  candidateOrdinal: number;
  fileName: string;
}

export async function importFdbLazy(
  file: File,
): Promise<{ result: FdbImportResult; plays: StoredPlay[] }> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const fastDraw = await loadFastDrawModules();

  const api = fastDraw as typeof fastDraw & {
    parseLazyNative?: (
      bytes: Uint8Array,
      filename: string,
      options?: { sourceId?: string },
    ) => Promise<import("@/lib/fastdraw/types").FastDrawExportData>;
  };

  if (typeof api.parseLazyNative !== "function") {
    throw new Error("Lazy import is not available in this FastDraw build.");
  }

  const sourceId = `fdb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const exportData = await api.parseLazyNative(bytes, file.name, { sourceId });
  const legacyPlays =
    exportData.playData?.sections?.flatMap((s) => s.plays ?? []) ?? [];

  const stored = legacyPlays.map((p) => {
    const play = legacyPlayToStored(p, "fdb-import");
    const lazy = (p as { fastDrawLazy?: FdbLazyMeta }).fastDrawLazy;
    if (lazy) {
      return {
        ...play,
        fastDrawLazy: lazy,
        lazyPending: true,
      };
    }
    return play;
  });

  if (stored.length) {
    await putStoredPlays(stored);
    if (typeof window !== "undefined") {
      try {
        const cacheKey = `fastcourt_fdb_source_${sourceId}`;
        const slice = bytes.subarray(0, Math.min(bytes.length, FDB_SOURCE_CACHE_MAX_BYTES));
        sessionStorage.setItem(cacheKey, bytesToBase64(slice));
        sessionStorage.setItem(`${cacheKey}_name`, file.name);
      } catch {
        // large files may exceed sessionStorage quota
      }
    }
  }

  const result: FdbImportResult = {
    imported: stored.length,
    skipped: 0,
    hasMoreBatches: false,
    nextBatchSkip: 0,
    batchIndex: 1,
    format: exportData.importMeta?.format ?? "fastdraw_native_lazy",
    message:
      stored.length === 0
        ? "No plays indexed from this file."
        : `Lazy import: ${stored.length} play(s) indexed. Diagrams decode when opened.`,
  };

  return { result, plays: stored };
}

export async function decodeLazyPlay(
  play: StoredPlay,
): Promise<StoredPlay | null> {
  const lazy = play.fastDrawLazy;
  if (!lazy || !play.lazyPending) return play;

  const cacheKey = `fastcourt_fdb_source_${lazy.sourceId}`;
  const b64 = typeof window !== "undefined" ? sessionStorage.getItem(cacheKey) : null;
  if (!b64) return null;

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  await loadFastDrawModules();
  const decode = window.FastDrawDecode as {
    decodeNativeCandidate?: (
      bytes: Uint8Array,
      ordinal: number,
      options?: Record<string, unknown>,
    ) => { plays?: unknown[]; play?: unknown } | null;
  } | undefined;

  if (typeof decode?.decodeNativeCandidate !== "function") {
    return null;
  }

  const decodedNative = decode.decodeNativeCandidate(bytes, lazy.candidateOrdinal);
  const legacyPlay =
    (decodedNative as { plays?: unknown[] })?.plays?.[0] ??
    (decodedNative as { play?: unknown })?.play;
  if (!legacyPlay || typeof legacyPlay !== "object") return null;

  const decoded = legacyPlayToStored(
    legacyPlay as Parameters<typeof legacyPlayToStored>[0],
    "fdb-import",
  );
  return {
    ...decoded,
    id: play.id,
    title: play.title,
    team: play.team,
    season: play.season,
    series: play.series,
    tags: play.tags,
    favorite: play.favorite,
    createdAt: play.createdAt,
    lazyPending: false,
    fastDrawLazy: lazy,
  };
}
