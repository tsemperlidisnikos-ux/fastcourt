"use client";

import { useEffect } from "react";
import { confirmDiscardDesignerChanges } from "@/lib/designer/confirm-discard-designer";

/** Warn on tab close/refresh and confirm on browser back when dirty. */
export function useDesignerUnsavedGuard(isDirty: boolean, enabled = true) {
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled, isDirty]);

  useEffect(() => {
    if (!enabled || !isDirty) return;

    const url = window.location.href;
    window.history.pushState({ fcDesignerGuard: true }, "", url);

    const onPopState = () => {
      void (async () => {
        const discard = await confirmDiscardDesignerChanges();
        if (discard) {
          window.removeEventListener("popstate", onPopState);
          window.history.back();
          return;
        }
        window.history.pushState({ fcDesignerGuard: true }, "", url);
      })();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [enabled, isDirty]);
}
