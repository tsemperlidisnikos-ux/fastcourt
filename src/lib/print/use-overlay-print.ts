"use client";

import { useCallback, useEffect, useRef } from "react";
import { installKonvaPrintSnapshots } from "@/lib/print/konva-print-snapshots";
import { printRootInIframe } from "@/lib/print/print-root-in-iframe";
import { waitForPrintContentReady } from "@/lib/print/wait-for-print-content-ready";

interface Options {
  printClass: string;
  contentRootId: string;
  onClose: () => void;
  /** iframe = clone preview DOM (recommended for playbooks); overlay = legacy window.print */
  strategy?: "iframe" | "overlay";
}

export function useOverlayPrint({
  printClass,
  contentRootId,
  onClose,
  strategy = "overlay",
}: Options) {
  const restoreSnapshotsRef = useRef<(() => void) | null>(null);
  const printingRef = useRef(false);

  const setPrintActive = useCallback(
    (active: boolean) => {
      document.documentElement.classList.toggle(printClass, active);
    },
    [printClass],
  );

  const installSnapshots = useCallback(() => {
    restoreSnapshotsRef.current?.();
    const root = document.getElementById(contentRootId);
    restoreSnapshotsRef.current = installKonvaPrintSnapshots(root);
  }, [contentRootId]);

  const cleanupPrint = useCallback(() => {
    restoreSnapshotsRef.current?.();
    restoreSnapshotsRef.current = null;
    setPrintActive(false);
    printingRef.current = false;
  }, [setPrintActive]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    function onBeforePrint() {
      if (strategy === "iframe") return;
      setPrintActive(true);
      installSnapshots();
    }

    function onAfterPrint() {
      if (strategy === "iframe") return;
      cleanupPrint();
    }

    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      cleanupPrint();
    };
  }, [cleanupPrint, installSnapshots, onClose, setPrintActive, strategy]);

  const handlePrint = useCallback(() => {
    if (printingRef.current) return;
    printingRef.current = true;

    restoreSnapshotsRef.current?.();
    restoreSnapshotsRef.current = null;

    if (strategy === "iframe") {
      const root = document.getElementById(contentRootId);
      if (!root) {
        printingRef.current = false;
        return;
      }

      void (async () => {
        await waitForPrintContentReady(contentRootId);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            installSnapshots();
            requestAnimationFrame(() => {
              void printRootInIframe(root)
                .catch((err) => {
                  console.error("FastCourt iframe print failed:", err);
                })
                .finally(() => {
                  cleanupPrint();
                });
            });
          });
        });
      })();
      return;
    }

    setPrintActive(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        installSnapshots();
        requestAnimationFrame(() => {
          window.print();
        });
      });
    });
  }, [cleanupPrint, contentRootId, installSnapshots, setPrintActive, strategy]);

  return handlePrint;
}
