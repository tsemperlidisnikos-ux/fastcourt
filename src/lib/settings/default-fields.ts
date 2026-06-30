import type { DefaultFieldsConfig } from "@/types/default-fields";

const STORAGE_KEY = "fastcourt_default_fields_v1";

export type ProtectedFieldTab = keyof DefaultFieldsConfig;

export const DEFAULT_FIELDS_CONFIG: DefaultFieldsConfig = {
  seasons: [],
  series: [],
  tags: [
    "ATO",
    "BLOB",
    "SLOB",
    "Zone",
    "Press",
    "Transition",
    "Defense",
    "Special",
  ],
};

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeList(values: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(values)) return [...fallback];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const name = String(raw ?? "").trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(name);
  }
  return out.length ? out : [...fallback];
}

export function normalizeDefaultFieldsConfig(
  raw: unknown,
): DefaultFieldsConfig {
  const input =
    raw && typeof raw === "object" ? (raw as Partial<DefaultFieldsConfig>) : {};
  const seasons = normalizeList(input.seasons);
  return {
    seasons,
    series: normalizeList(input.series),
    tags: normalizeList(input.tags),
  };
}

export function loadDefaultFieldsConfig(): DefaultFieldsConfig {
  if (!isBrowser()) return { ...DEFAULT_FIELDS_CONFIG };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_FIELDS_CONFIG };
    return normalizeDefaultFieldsConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_FIELDS_CONFIG };
  }
}

export function saveDefaultFieldsConfig(config: DefaultFieldsConfig): void {
  if (!isBrowser()) return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizeDefaultFieldsConfig(config)),
  );
}

export function mergeFieldLists(
  userValues: string[],
  globalValues: string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of [...globalValues, ...userValues]) {
    const name = String(raw ?? "").trim();
    if (!name) continue;
    const lower = name.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    out.push(name);
  }
  return out;
}

export function getProtectedDefaultFields(tab: ProtectedFieldTab): string[] {
  const config = loadDefaultFieldsConfig();
  return config[tab];
}

export function isProtectedDefaultField(
  tab: ProtectedFieldTab,
  name: string,
): boolean {
  const lower = name.trim().toLowerCase();
  if (!lower) return false;
  return getProtectedDefaultFields(tab).some(
    (value) => value.toLowerCase() === lower,
  );
}

export function stripProtectedDefaultFields(
  tab: ProtectedFieldTab,
  values: string[],
): string[] {
  const protectedLower = new Set(
    getProtectedDefaultFields(tab).map((value) => value.toLowerCase()),
  );
  return values.filter((value) => !protectedLower.has(value.toLowerCase()));
}

export function createEmptyDefaultFieldsConfig(): DefaultFieldsConfig {
  return {
    seasons: [],
    series: [],
    tags: [],
  };
}
