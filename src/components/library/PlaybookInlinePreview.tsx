"use client";

import { PlaybookPrintDocument } from "@/components/library/PlaybookPrintDocument";
import type { PlaybookSection } from "@/types/library-meta";
import type { PlaybookPrintConfig } from "@/types/playbook-print-config";
import type { StoredPlay } from "@/types/library";

interface Props {
  playbook: PlaybookSection;
  plays: StoredPlay[];
  printConfig?: PlaybookPrintConfig;
  scrollToPlayId?: string | null;
  loading?: boolean;
}

export function PlaybookInlinePreview({
  playbook,
  plays,
  printConfig,
  scrollToPlayId,
  loading,
}: Props) {
  if (loading) {
    return (
      <div
        className="fc-playbooks-playbook-preview-loading"
        id="fc-playbooks-playbook-preview-loading"
      >
        Building print preview…
      </div>
    );
  }

  if (!plays.length) {
    return (
      <div
        className="fc-playbooks-playbook-preview-loading"
        id="fc-playbooks-playbook-preview-loading"
      />
    );
  }

  return (
    <section
      className="fc-playbooks-playbook-preview-pane"
      id="fc-playbooks-playbook-preview-pane"
      aria-label="Playbook print preview"
    >
      <div
        className="fc-playbooks-playbook-preview-scroll"
        id="fc-playbooks-playbook-preview-scroll"
      >
        <PlaybookPrintDocument
          playbookName={playbook.name}
          team={playbook.team}
          subtitle={playbook.subtitle}
          plays={plays}
          printConfig={printConfig}
          scrollToPlayId={scrollToPlayId}
        />
      </div>
    </section>
  );
}
