const PREFS_KEY = "practiceLivePrefs_v1";

export type PracticeLivePrefs = {
  autoStartTimer: boolean;
  timerSound: boolean;
};

const DEFAULT_PREFS: PracticeLivePrefs = {
  autoStartTimer: true,
  timerSound: true,
};

export function loadPracticeLivePrefs(): PracticeLivePrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULT_PREFS;
}

export function savePracticeLivePrefs(prefs: PracticeLivePrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
