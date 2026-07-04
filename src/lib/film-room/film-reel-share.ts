import type { PossessionReelManifest } from "@/lib/film-room/possession-reel-export";
import type { FilmRoomVideoSource } from "@/types/film-room";
import {
  compressJson,
  type SmartShareResult,
} from "@/lib/share/share-link";

const HASH_PREFIX = "s=";

export type ShareFilmReelSegment = {
  timeLabel: string;
  label: string;
  startSec: number;
  endSec: number;
  path: string;
  note?: string;
  kind?: "chapter" | "disruption";
};

export type ShareFilmReelPayload = {
  v: number;
  type: "filmreel";
  sessionId: string;
  session: {
    title: string;
    sourceKind: FilmRoomVideoSource["kind"];
  };
  segments: ShareFilmReelSegment[];
  filmReelView?: boolean;
};

export function encodeFilmReelPayload(
  manifest: PossessionReelManifest,
): ShareFilmReelPayload {
  return {
    v: 1,
    type: "filmreel",
    sessionId: manifest.sessionId,
    session: {
      title: manifest.sessionTitle,
      sourceKind: manifest.sourceKind,
    },
    segments: manifest.segments.map((segment) => ({
      timeLabel: segment.timeLabel,
      label: segment.label,
      startSec: segment.startSec,
      endSec: segment.endSec,
      path: segment.deepLink.replace(/^https?:\/\/[^/]+/, ""),
      note: segment.note,
      kind: segment.kind,
    })),
    filmReelView: true,
  };
}

export function buildFilmReelShareUrl(manifest: PossessionReelManifest): SmartShareResult {
  if (!manifest.segments.length) {
    return { ok: false, error: "empty" };
  }
  if (typeof window === "undefined") {
    return { ok: false, error: "browser_only" };
  }
  const payload = encodeFilmReelPayload(manifest);
  const json = JSON.stringify(payload);
  const compressed = compressJson(json);
  const base = window.location.href.split("#")[0].split("?")[0];
  const url = `${base}#${HASH_PREFIX}${compressed}`;
  if (url.length > 120000) {
    return { ok: false, error: "too_long" };
  }
  return { ok: true, url, mode: "hash" };
}
