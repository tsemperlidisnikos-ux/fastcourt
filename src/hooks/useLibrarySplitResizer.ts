"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "fastcourt_library_split_pct";
const DEFAULT_PCT = 42;
const MIN_PCT = 28;
const MAX_PCT = 62;

export function useLibrarySplitResizer(shellId = "org-library-shell") {
  const [splitPct, setSplitPct] = useState(DEFAULT_PCT);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(saved) && saved >= MIN_PCT && saved <= MAX_PCT) {
      setSplitPct(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty(
      "--fc-lib-list-split-pct",
      `${splitPct}%`,
    );
    const shell = document.getElementById(shellId);
    if (shell) {
      shell.style.setProperty("--fc-tablet-library-list-pct", `${splitPct}%`);
    }
  }, [splitPct, shellId]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    draggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const shell = document.getElementById(shellId);
    if (!shell) return;
    const rect = shell.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(MAX_PCT, Math.max(MIN_PCT, pct));
    setSplitPct(clamped);
  }, [shellId]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    localStorage.setItem(STORAGE_KEY, String(splitPct));
  }, [splitPct]);

  return {
    splitPct,
    resizerProps: {
      className: "fd-split-resizer org-split-resizer fc-tablet-library-shell-resizer",
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      role: "separator" as const,
      "aria-orientation": "vertical" as const,
      "aria-label": "Resize library list",
    },
  };
}
