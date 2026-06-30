import type { CourtType, CourtViewSettings, PlayDocument } from "@/types/designer";

export type LibraryItemType = "play" | "drill" | "playbook";

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
