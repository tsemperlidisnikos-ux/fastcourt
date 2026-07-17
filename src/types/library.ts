import type { CourtType, CourtViewSettings, PlayDocument } from "@/types/designer";

export type LibraryItemType = "play" | "drill" | "playbook";

/** Marks a library play as a reusable defensive counter for specific looks. */
export interface DefenseCounterMeta {
  enabled: boolean;
  /** Coverage ids (ice, switch, drop, …) — see COUNTER_COVERAGE_LABELS. */
  coverages: string[];
  /** Offensive patterns this counters (PNR, Horns, Spain, …). */
  vsPatterns: string[];
  notes?: string;
}

export interface PlayDetailsValues {
  type: LibraryItemType;
  title: string;
  team: string;
  series: string;
  tags: string[];
  courtType: CourtType;
  courtView?: CourtViewSettings;
  season: string;
  playNotes: string;
  videoUrl: string;
  defenseCounter?: DefenseCounterMeta;
}

export interface FdbLazyMeta {
  sourceId: string;
  candidateOrdinal: number;
  fileName: string;
}

export interface StoredPlay extends PlayDocument {
  type: LibraryItemType;
  season?: string;
  team?: string;
  series?: string;
  tags: string[];
  playNotes?: string;
  videoUrl?: string;
  /** When set, Coach / Film Room prefer this play for matching counters. */
  defenseCounter?: DefenseCounterMeta;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
  source?: "manual" | "fdb-import";
  fastDrawLazy?: FdbLazyMeta;
  lazyPending?: boolean;
  /** Cloud solo library: only this Supabase user may see/edit the play. */
  ownerUserId?: string;
  /** Owner email snapshot — prevents cross-account play reuse in cloud. */
  ownerEmail?: string;
  /** Snapshot of creator name for admin library views. */
  ownerDisplayName?: string;
}

export interface LibraryItem {
  id: string;
  title: string;
  type: LibraryItemType;
  season?: string;
  team?: string;
  series?: string;
  tags: string[];
  frameCount: number;
  updatedAt: string;
  favorite?: boolean;
  /** Snapshot when play is marked in Counter Library. */
  defenseCounter?: Pick<DefenseCounterMeta, "enabled" | "coverages" | "vsPatterns">;
  source?: StoredPlay["source"];
  lazyPending?: boolean;
  ownerUserId?: string;
  ownerEmail?: string;
  ownerDisplayName?: string;
}

export interface FdbImportResult {
  imported: number;
  skipped: number;
  hasMoreBatches: boolean;
  nextBatchSkip: number;
  batchIndex: number;
  format: string;
  message?: string;
}
