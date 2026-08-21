"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PlaybookPrintDocument } from "@/components/library/PlaybookPrintDocument";
import { PlaybookPrintSettingsPanel } from "@/components/library/PlaybookPrintSettingsPanel";
import { SettingsGearIcon } from "@/components/library/SettingsGearIcon";
import { useOverlayPrint } from "@/lib/print/use-overlay-print";
import { waitForPrintContentReady } from "@/lib/print/wait-for-print-content-ready";
import { usePlaybookPrintConfigStore } from "@/stores/playbook-print-config-store";
import type { PlaybookSection } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";
import type { PlaybookPrintConfig } from "@/types/playbook-print-config";

interface Props {
  playbook: PlaybookSection;
  plays: StoredPlay[];
  autoPrintOnOpen?: boolean;
  onClose: () => void;
}

export function PlaybookPrintOverlay({
  playbook,
  plays,
  autoPrintOnOpen = false,
  onClose,
}: Props) {
  const [settingsOpen, setSettingsOpen] = useState(!autoPrintOnOpen);
  const printConfig = usePlaybookPrintConfigStore((s) => s.config);
  const hydratePrintConfig = usePlaybookPrintConfigStore((s) => s.hydrate);
  const printConfigHydrated = usePlaybookPrintConfigStore((s) => s.hydrated);
  /** Live draft from settings pane — preview updates before Save. */
  const [previewConfig, setPreviewConfig] = useState<PlaybookPrintConfig | null>(
    null,
  );
  const activePrintConfig = previewConfig ?? printConfig;

  useEffect(() => {
    setPreviewConfig(null);
  }, [printConfig]);
  const handlePrint = useOverlayPrint({
    printClass: "fc-playbook-print-active",
    contentRootId: "fc-playbook-print-content",
    onClose,
    strategy: "iframe",
  });

  useEffect(() => {
    if (!printConfigHydrated) hydratePrintConfig();
  }, [printConfigHydrated, hydratePrintConfig]);

  useEffect(() => {
    if (!autoPrintOnOpen || !printConfigHydrated) return;

    let cancelled = false;

    void (async () => {
      await waitForPrintContentReady("fc-playbook-print-content");
      if (cancelled) return;
      handlePrint();
    })();

    return () => {
      cancelled = true;
    };
  }, [autoPrintOnOpen, printConfigHydrated, handlePrint, plays]);

  useEffect(() => {
    if (!autoPrintOnOpen) return;

    function onAfterPrint() {
      onClose();
    }

    window.addEventListener("afterprint", onAfterPrint);
    return () => window.removeEventListener("afterprint", onAfterPrint);
  }, [autoPrintOnOpen, onClose]);

  return createPortal(
    <div
      className={`fc-print-overlay${autoPrintOnOpen ? " fc-print-overlay-auto-pdf" : ""}`}
      id="playbook-print-overlay"
      role="dialog"
    >
      <div className="fc-print-overlay-backdrop" onClick={onClose} aria-hidden />
      <div
        className={`fc-print-overlay-panel fc-print-overlay-panel-playbook${settingsOpen ? " has-print-settings" : ""}`}
      >
        <div className="fc-print-overlay-toolbar no-print">
          <div className="fc-print-overlay-toolbar-left">
            <button
              type="button"
              className={`fc-playbooks-settings-btn fc-print-settings-gear${settingsOpen ? " active" : ""}`}
              title="Print settings"
              aria-label="Print settings"
              aria-pressed={settingsOpen}
              onClick={() => setSettingsOpen((open) => !open)}
            >
              <SettingsGearIcon size={22} />
            </button>
            <h2 className="fc-print-overlay-title">
              {playbook.name} — Print preview
            </h2>
          </div>
          <div className="fc-print-overlay-actions">
            <button type="button" className="fc-print-btn" onClick={handlePrint}>
              Print / Save PDF
            </button>
            <button type="button" className="fc-print-close-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <div
          className={`fc-print-overlay-content-row${settingsOpen ? " has-settings" : ""}`}
        >
          {settingsOpen ? (
            <PlaybookPrintSettingsPanel
              className="fc-print-overlay-settings-pane"
              closeOnSave={false}
              onClose={() => setSettingsOpen(false)}
              onDraftChange={setPreviewConfig}
            />
          ) : null}
          <div
            className="fc-print-overlay-body fc-print-overlay-body-playbook"
            id="fc-playbook-print-content"
          >
            <PlaybookPrintDocument
              playbookName={playbook.name}
              team={playbook.team}
              subtitle={playbook.subtitle}
              plays={plays}
              printConfig={activePrintConfig}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
