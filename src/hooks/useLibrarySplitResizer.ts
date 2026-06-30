"use client";

/** Fixed library list | preview divider (no drag). Width comes from appearance settings. */
export function useLibrarySplitResizer() {
  return {
    resizerProps: {
      className: "fd-split-resizer org-split-resizer is-fixed",
      role: "separator" as const,
      "aria-orientation": "vertical" as const,
      "aria-hidden": true as const,
    },
  };
}
