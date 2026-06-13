export interface FastDrawImportApi {
  detectFormat(bytes: Uint8Array): string;
  analyze(bytes: Uint8Array, filename?: string): Promise<{
    format: string;
    canNamesOnly?: boolean;
    nameCount?: number;
    hints?: string[];
    converterRequired?: boolean;
  }>;
  parse(
    bytes: Uint8Array,
    filename?: string,
    options?: {
      maxPlays?: number;
      skipCandidates?: number;
      batchIndex?: number;
    },
  ): Promise<FastDrawExportData>;
  parseLazyNative?(
    bytes: Uint8Array,
    filename?: string,
    options?: { sourceId?: string },
  ): Promise<FastDrawExportData>;
  DECODE_BATCH_SIZE: number;
}

export interface FastDrawExportData {
  version?: string;
  exportedAt?: string;
  playData?: {
    sections?: Array<{
      name?: string;
      plays?: LegacyImportedPlay[];
    }>;
  };
  importMeta?: {
    hasMoreBatches?: boolean;
    nextBatchSkip?: number;
    batchIndex?: number;
    batchImported?: number;
    remainingCandidates?: number;
    format?: string;
  };
}

export interface LegacyImportedPlay {
  id?: string;
  name?: string;
  courtType?: "half" | "full";
  category?: string;
  team?: string;
  state?: {
    frames?: Array<{
      name?: string;
      players?: Array<{
        number?: string | number;
        num?: string | number;
        x?: number;
        y?: number;
        nx?: number;
        ny?: number;
        isDefense?: boolean;
        hasBall?: boolean;
      }>;
    }>;
  };
}

declare global {
  interface Window {
    FastDrawDecode?: unknown;
    FastDrawImport?: FastDrawImportApi;
    FastDrawIcbScan?: unknown;
  }
}
