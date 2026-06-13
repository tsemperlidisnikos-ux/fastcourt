"use client";

import { useEffect, useRef, useState } from "react";
import {
  getLibrarySortOption,
  LIBRARY_SORT_OPTIONS,
  loadLibrarySortId,
  saveLibrarySortId,
  type LibrarySortId,
} from "@/lib/library/library-sort";

interface Props {
  sortId: LibrarySortId;
  onSortChange: (sortId: LibrarySortId) => void;
}

export function LibrarySortControl({ sortId, onSortChange }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mode = getLibrarySortOption(sortId);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);

  return (
    <div className="fc-fd-library-sort-wrap" id="fc-fd-library-sort-wrap" ref={wrapRef}>
      <span className="fd-filter-label fc-fd-library-sort-label">Sort</span>
      <button
        type="button"
        className={`fc-fd-library-sort-btn${sortId !== "name-asc" ? " is-active" : ""}`}
        id="fc-fd-library-sort-btn"
        title={`Sort: ${mode.label}`}
        aria-label={`Sort library: ${mode.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <svg
          className="fc-fd-library-sort-icon"
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18M7 12h10M11 18h2" />
        </svg>
      </button>
      <div
        className="fc-fd-library-sort-menu"
        id="fc-fd-library-sort-menu"
        hidden={!open}
        role="menu"
        aria-label="Sort library"
      >
        {LIBRARY_SORT_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`fc-fd-library-sort-option${opt.id === sortId ? " is-active" : ""}`}
            role="menuitemradio"
            aria-checked={opt.id === sortId}
            data-library-sort={opt.id}
            onClick={(e) => {
              e.stopPropagation();
              saveLibrarySortId(opt.id);
              onSortChange(opt.id);
              setOpen(false);
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function useLibrarySortId() {
  const [sortId, setSortId] = useState<LibrarySortId>(() => loadLibrarySortId());
  return [sortId, setSortId] as const;
}
