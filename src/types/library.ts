import type { CourtType, PlayDocument } from "@/types/designer";

export type LibraryItemType = "play" | "drill" | "playbook";

export interface PlayDetailsValues {
  type: LibraryItemType;
  title: string;
  team: string;
  series: string;
  tags: string[];
  courtType: CourtType;
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
