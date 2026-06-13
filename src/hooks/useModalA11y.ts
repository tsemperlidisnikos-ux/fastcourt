"use client";

import { useEffect, useId, useRef } from "react";

export function useModalA11y(open: boolean, onClose: () => void) {
  const dialogId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = `${dialogId}-title`;
  const fieldId = `${dialogId}-field`;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !panelRef.current) return;
    const t = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      focusable?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  return { panelRef, titleId, fieldId };
}
