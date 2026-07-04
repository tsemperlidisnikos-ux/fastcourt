import type { FilmClipAnalysisResult } from "@/lib/film-room/film-clip-analyze-types";

export type FilmRoomInkTool = "pointer" | "pen" | "laser" | "eraser";

export type FilmRoomVideoSource =
  | {
      kind: "upload";
      blobId: string;
      fileName: string;
      mimeType?: string;
    }
  | {
      kind: "youtube";
      videoId: string;
      originalUrl: string;
    }
  | {
      kind: "direct";
      url: string;
      label?: string;
    };
export interface VideoAnnotationStroke {
  id: string;
  /** Video timestamp (seconds) when the stroke was drawn. */
  time: number;
  /** Normalized 0–1 coordinates relative to the video overlay. */
  points: number[];
  color: string;
  width: number;
  /** Laser strokes fade after a short hold; pen strokes persist. */
  kind: "pen" | "laser";
}

/** Manual coach tags on the timeline (Level A data acquisition). */
export type FilmRoomEventKind =
  | "pnr"
  | "handoff"
  | "cut"
  | "screen"
  | "iso"
  | "flare"
  | "transition";

export interface FilmRoomEvent {
  id: string;
  kind: FilmRoomEventKind;
  /** Video timestamp (seconds). */
  time: number;
  note?: string;
  createdAt: number;
}

/** Defensive reads that disrupt the offense plan (Level A+ tagging). */
export type FilmRoomDisruptionKind =
  | "hedge"
  | "switch"
  | "trap"
  | "ice"
  | "deny"
  | "top_lock"
  | "help"
  | "collapse"
  | "drop";

export interface FilmRoomDisruption {
  id: string;
  kind: FilmRoomDisruptionKind;
  /** Video timestamp (seconds). */
  time: number;
  note?: string;
  createdAt: number;
}

/** Possession / chapter markers for quick navigation. */
export type FilmRoomBookmarkKind = "chapter" | "disruption";

export interface FilmRoomBookmark {
  id: string;
  /** Video timestamp (seconds). */
  time: number;
  label: string;
  note?: string;
  kind?: FilmRoomBookmarkKind;
  createdAt: number;
}

/** Saved AI scout read for a session playhead. */
export interface FilmRoomAnalysisRecord {
  id: string;
  playheadTime: number;
  result: FilmClipAnalysisResult;
  frameCount: number;
  coachTags: Array<{
    kind: FilmRoomEventKind;
    time: number;
    note?: string;
  }>;
  disruptionTags?: Array<{
    kind: FilmRoomDisruptionKind;
    time: number;
    note?: string;
  }>;
  createdAt: number;
}

export interface FilmRoomSession {
  id: string;
  title: string;
  source: FilmRoomVideoSource;
  strokes: VideoAnnotationStroke[];
  /** Coach-tagged actions on the timeline. */
  events: FilmRoomEvent[];
  /** Defensive disruption tags (ICE, switch, hedge…). */
  disruptions: FilmRoomDisruption[];
  /** Chapter / possession bookmarks on the timeline. */
  bookmarks: FilmRoomBookmark[];
  /** Past AI analyze results for this clip. */
  analyses: FilmRoomAnalysisRecord[];
  createdAt: number;
  updatedAt: number;
}
