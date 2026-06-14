"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { PrintPreviewIcon } from "@/components/library/PrintPreviewIcon";
import { LibraryPrintOverlay } from "@/components/library/LibraryPrintOverlay";
import { PlaybookInlinePreview } from "@/components/library/PlaybookInlinePreview";
import { PlaybookPrintOverlay } from "@/components/library/PlaybookPrintOverlay";
import { PlaybookPrintSettingsPanel } from "@/components/library/PlaybookPrintSettingsPanel";
import { PresentationOverlay } from "@/components/library/PresentationOverlay";
import { SettingsGearIcon } from "@/components/library/SettingsGearIcon";
import { AddPlayToPlaybookModal } from "@/components/library/AddPlayToPlaybookModal";
import { shareContentToPlayers } from "@/lib/players/share-to-players";
import { useOrganizerStore } from "@/stores/organizer-store";
import {
  appConfirm,
  appNotice,
  appPlaybookName,
} from "@/stores/dialog-store";
import { usePlaybookPrintConfigStore } from "@/stores/playbook-print-config-store";
import type { StoredPlay } from "@/types/library";

const PAGE_SIZE = 8;

function formatUpdated(iso: string) {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "recently";
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return "0 minutes ago";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
}

export function PlaybooksView() {
  const router = useRouter();
  const playbooks = useOrganizerStore((s) => s.playbooks);
  const plays = useOrganizerStore((s) => s.plays);
  const teams = useOrganizerStore((s) => s.teams);
  const createPlaybook = useOrganizerStore((s) => s.createPlaybook);
  const updatePlaybook = useOrganizerStore((s) => s.updatePlaybook);
  const deletePlaybook = useOrganizerStore((s) => s.deletePlaybook);
  const addPlayToPlaybook = useOrganizerStore((s) => s.addPlayToPlaybook);
  const removePlayFromPlaybook = useOrganizerStore((s) => s.removePlayFromPlaybook);
  const reorderPlaybookPlays = useOrganizerStore((s) => s.reorderPlaybookPlays);
  const resolvePlaybookPlays = useOrganizerStore((s) => s.resolvePlaybookPlays);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragPlayIndex, setDragPlayIndex] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [printPlay, setPrintPlay] = useState<StoredPlay | null>(null);
  const [printPlaybookOpen, setPrintPlaybookOpen] = useState(false);
  const [printSettingsOpen, setPrintSettingsOpen] = useState(false);
  const [presentPlay, setPresentPlay] = useState<StoredPlay | null>(null);
  const [manageMenuOpen, setManageMenuOpen] = useState(false);
  const [selectedPlayId, setSelectedPlayId] = useState<string | null>(null);
  const [addPlayOpen, setAddPlayOpen] = useState(false);
  const headerActionsSlot = useSyncExternalStore(
    () => () => {},
    () => document.getElementById("fd-main-tabs-actions"),
    () => null,
  );

  useEffect(() => {
    if (!manageMenuOpen) return;
    function closeMenu() {
      setManageMenuOpen(false);
    }
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, [manageMenuOpen]);

  const printConfig = usePlaybookPrintConfigStore((s) => s.config);
  const printConfigHydrated = usePlaybookPrintConfigStore((s) => s.hydrated);
  const hydratePrintConfig = usePlaybookPrintConfigStore((s) => s.hydrate);

  useEffect(() => {
    if (!printConfigHydrated) hydratePrintConfig();
  }, [printConfigHydrated, hydratePrintConfig]);

  const selected = playbooks.find((p) => p.id === selectedId) ?? null;
  const selectedPlays = useMemo(
    () => (selected ? resolvePlaybookPlays(selected) : []),
    [selected, resolvePlaybookPlays],
  );

  const activePlayId = useMemo(() => {
    if (!selectedPlays.length) return null;
    if (
      selectedPlayId &&
      selectedPlays.some((play) => play.id === selectedPlayId)
    ) {
      return selectedPlayId;
    }
    return selectedPlays[0]?.id ?? null;
  }, [selectedPlays, selectedPlayId]);

  const totalPages = Math.max(1, Math.ceil(playbooks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = playbooks.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );
  const from = playbooks.length ? safePage * PAGE_SIZE + 1 : 0;
  const to = Math.min(playbooks.length, (safePage + 1) * PAGE_SIZE);

  const availablePlays = useMemo(
    () => plays.filter((p) => p.type !== "playbook"),
    [plays],
  );

  const excludedPlayIds = useMemo(
    () => new Set(selected?.playRefs ?? []),
    [selected?.playRefs],
  );

  function handleOpenAddPlay() {
    if (!selected) return;
    if (!availablePlays.some((play) => !excludedPlayIds.has(play.id))) {
      appNotice(
        "No plays available",
        "All library plays are already in this playbook.",
      );
      return;
    }
    setAddPlayOpen(true);
  }

  async function handleOpenCreatePlaybook() {
    const result = await appPlaybookName({
      mode: "create",
      teams,
      existingNames: playbooks.map((pb) => pb.name),
    });
    if (!result) return;
    const pb = await createPlaybook(result.name, result.team);
    setSelectedId(pb.id);
  }

  async function handleOpenRenamePlaybook() {
    if (!selected) return;
    const result = await appPlaybookName({
      mode: "rename",
      initialName: selected.name,
      initialTeam: selected.team,
      teams,
      existingNames: playbooks
        .filter((pb) => pb.id !== selected.id)
        .map((pb) => pb.name),
    });
    if (!result) return;
    await updatePlaybook(selected.id, { name: result.name });
    setManageMenuOpen(false);
  }

  async function handleOpenDeletePlaybook() {
    if (!selected) return;
    const playCount = selected.playRefs.length;
    const confirmed = await appConfirm({
      title: "Delete playbook",
      message: `Delete "${selected.name}"?${playCount > 0 ? ` This playbook contains ${playCount} play${playCount === 1 ? "" : "s"}.` : ""} This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    await handleDeletePlaybook();
  }

  async function handleOpenRemovePlay(play: { id: string; title: string }) {
    if (!selected) return;
    const confirmed = await appConfirm({
      title: "Remove from playbook",
      message: `Remove "${play.title}" from "${selected.name}"? The play stays in your library.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!confirmed) return;
    await removePlayFromPlaybook(selected.id, play.id);
  }

  async function handleAddPlays(playIds: string[]) {
    if (!selected) return;
    for (const playId of playIds) {
      await addPlayToPlaybook(selected.id, playId);
    }
  }

  async function handleDeletePlaybook() {
    if (!selected) return;
    await deletePlaybook(selected.id);
    setSelectedId(null);
    setManageMenuOpen(false);
  }

  function handlePrintPreview() {
    if (!selected || !selectedPlays.length) return;
    setPrintPlaybookOpen(true);
  }

  function handlePresent() {
    if (!selectedPlays.length) return;
    const play =
      selectedPlays.find((item) => item.id === activePlayId) ?? selectedPlays[0];
    setPresentPlay(play);
  }

  const detailState = !selected
    ? "pick-playbook"
    : !selectedPlays.length
      ? "empty"
      : "split";

  const headerActions =
    headerActionsSlot &&
    playbooks.length > 0 &&
    createPortal(
      <button
        type="button"
        className={`fc-playbooks-settings-btn${printSettingsOpen ? " active" : ""}`}
        id="btn-playbooks-print-settings"
        title="Print settings"
        aria-label="Print settings"
        aria-pressed={printSettingsOpen}
        disabled={!selected}
        onClick={() => setPrintSettingsOpen((open) => !open)}
      >
        <SettingsGearIcon size={22} />
      </button>,
      headerActionsSlot,
    );

  return (
    <>
      {headerActions}
      <div className="fc-playbooks-shell" id="fc-playbooks-shell">
        <aside className="fc-playbooks-sidebar" id="fc-playbooks-sidebar" aria-label="Playbooks">
          <div className="fc-playbooks-sidebar-toolbar">
            <button
              type="button"
              className="fc-playbooks-create-btn"
              id="btn-playbooks-create-playbook"
              onClick={() => void handleOpenCreatePlaybook()}
            >
              Create Playbook
            </button>
            <div className="fc-playbooks-manage-wrap">
              <button
                type="button"
                className="fc-playbooks-manage-playbook-btn"
                id="btn-playbooks-manage-playbook"
                disabled={!playbooks.length}
                aria-expanded={manageMenuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setManageMenuOpen((open) => !open);
                }}
              >
                Manage Playbooks
              </button>
              <div
                className="fc-playbooks-manage-menu"
                id="fc-playbooks-manage-menu"
                hidden={!manageMenuOpen}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className="fc-playbooks-manage-menu-item"
                  disabled={!selected}
                  onClick={() => {
                    setManageMenuOpen(false);
                    void handleOpenRenamePlaybook();
                  }}
                >
                  Edit Playbook
                </button>
                <button
                  type="button"
                  className="fc-playbooks-manage-menu-item fc-playbooks-manage-menu-delete"
                  disabled={!selected}
                  onClick={() => {
                    setManageMenuOpen(false);
                    void handleOpenDeletePlaybook();
                  }}
                >
                  Delete Playbook
                </button>
              </div>
            </div>
          </div>
          <div
            className="fc-playbooks-sidebar-list"
            id="fc-playbooks-sidebar-list"
            role="listbox"
            aria-label="Playbook list"
          >
            {!playbooks.length ? (
              <div className="fc-playbooks-sidebar-empty">
                No playbooks yet. Create one to get started.
              </div>
            ) : (
              pageItems.map((section) => {
                const count = section.playRefs.length;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`fc-playbooks-sidebar-item${selectedId === section.id ? " selected" : ""}`}
                    role="option"
                    aria-selected={selectedId === section.id}
                    onClick={() => setSelectedId(section.id)}
                  >
                    <span className="fc-playbooks-sidebar-item-main">
                      <span className="fc-playbooks-sidebar-item-name">
                        {section.name}
                      </span>
                      <span className="fc-playbooks-sidebar-item-updated">
                        Updated {formatUpdated(section.updatedAt)}
                      </span>
                    </span>
                    <span className="fc-playbooks-sidebar-item-count">{count}</span>
                  </button>
                );
              })
            )}
          </div>
          <div
            className={`fc-playbooks-sidebar-footer fd-table-footer${playbooks.length ? "" : " is-hidden"}`}
          >
            <span className="fd-page-info" id="fc-playbooks-page-info">
              {from}–{to} of {playbooks.length}
            </span>
            <div className="fd-pagination">
              <button
                type="button"
                className="fd-page-btn"
                disabled={safePage <= 0}
                onClick={() => setPage(0)}
              >
                «
              </button>
              <button
                type="button"
                className="fd-page-btn"
                disabled={safePage <= 0}
                onClick={() => setPage(safePage - 1)}
              >
                ‹
              </button>
              <button
                type="button"
                className="fd-page-btn"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(safePage + 1)}
              >
                ›
              </button>
              <button
                type="button"
                className="fd-page-btn"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage(totalPages - 1)}
              >
                »
              </button>
            </div>
          </div>
        </aside>
        <section className="fc-playbooks-main" id="fc-playbooks-main" aria-label="Playbook contents">
          {!playbooks.length ? (
            <div className="fc-playbooks-main-empty" aria-hidden="true" />
          ) : (
            <>
          <header className="fc-playbooks-main-header">
            <h2 className="fc-playbooks-main-title" id="fc-playbooks-main-title">
              {selected?.name ?? ""}
            </h2>
          </header>
          <div className="fc-playbooks-main-toolbar">
            <div className="fc-playbooks-main-toolbar-left">
              <button
                type="button"
                className="fc-playbooks-add-play-btn"
                id="btn-playbooks-add-play"
                disabled={!selected}
                onClick={handleOpenAddPlay}
              >
                + Add Play
              </button>
            </div>
            <div className="fc-playbooks-main-toolbar-right">
              <button
                type="button"
                className="fc-playbooks-add-play-btn"
                id="btn-playbooks-send-players"
                disabled={!selected || !selectedPlays.length}
                onClick={() => {
                  if (!selected) return;
                  shareContentToPlayers({
                    kind: "playbook",
                    section: selected,
                    plays: selectedPlays,
                  });
                }}
              >
                Send to players
              </button>
              <button
                type="button"
                className="fc-playbooks-present-btn"
                id="btn-playbooks-present"
                title="Present play"
                aria-label="Present play"
                disabled={!selected || !selectedPlays.length}
                onClick={handlePresent}
              >
                ▶
              </button>
              <button
                type="button"
                className="fc-playbooks-preview-btn"
                id="btn-playbooks-preview"
                title="Print / preview layout"
                aria-label="Print preview"
                disabled={!selected || !selectedPlays.length}
                onClick={handlePrintPreview}
              >
                <PrintPreviewIcon size={22} />
              </button>
            </div>
          </div>
          <div className="fc-playbooks-main-body" id="fc-playbooks-main-body">
            {detailState !== "split" ? (
              <div className="fc-playbooks-empty-state" id="fc-playbooks-empty-state">
                <div className="fc-playbooks-empty">
                  <div className="fc-playbooks-empty-icon">
                    {detailState === "pick-playbook" ? "📘" : "📄"}
                  </div>
                  <p id="fc-playbooks-empty-message">
                    {detailState === "pick-playbook"
                      ? "Select a playbook from the list."
                      : "No Plays in this Playbook."}
                  </p>
                  {detailState === "empty" ? (
                    <p className="fc-playbooks-empty-sub">
                      Click Add Play to get started.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="fc-playbooks-detail-split" id="fc-playbooks-detail-split">
                <aside className="fc-playbooks-plays-pane" id="fc-playbooks-plays-pane">
                  <div className="fc-playbooks-plays-list" id="fc-playbooks-plays-list">
                    {selectedPlays.map((play, index) => (
                      <div
                        key={play.id}
                        className="fc-playbooks-list-item-row"
                        draggable
                        onDragStart={() => setDragPlayIndex(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (
                            selected &&
                            dragPlayIndex != null &&
                            dragPlayIndex !== index
                          ) {
                            void reorderPlaybookPlays(
                              selected.id,
                              dragPlayIndex,
                              index,
                            );
                          }
                          setDragPlayIndex(null);
                        }}
                      >
                        <button
                          type="button"
                          className={`fc-playbooks-list-item${activePlayId === play.id ? " selected" : ""}`}
                          onClick={() => setSelectedPlayId(play.id)}
                          onDoubleClick={(e) => {
                            e.preventDefault();
                            router.push(`/designer?item=${play.id}`);
                          }}
                        >
                          {play.title}
                        </button>
                        <button
                          type="button"
                          className="fc-playbooks-list-remove"
                          title="Remove from playbook"
                          aria-label="Remove from playbook"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (selected) {
                              void handleOpenRemovePlay({
                                id: play.id,
                                title: play.title,
                              });
                            }
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </aside>
                {selected ? (
                  printSettingsOpen ? (
                    <PlaybookPrintSettingsPanel
                      onClose={() => setPrintSettingsOpen(false)}
                    />
                  ) : (
                    <PlaybookInlinePreview
                      playbook={selected}
                      plays={selectedPlays}
                      scrollToPlayId={activePlayId}
                      printConfig={printConfig}
                    />
                  )
                ) : null}
              </div>
            )}
          </div>
            </>
          )}
        </section>
      </div>
      {printPlaybookOpen && selected && selectedPlays.length ? (
        <PlaybookPrintOverlay
          playbook={selected}
          plays={selectedPlays}
          printConfig={printConfig}
          onClose={() => setPrintPlaybookOpen(false)}
        />
      ) : null}
      {printPlay ? (
        <LibraryPrintOverlay play={printPlay} onClose={() => setPrintPlay(null)} />
      ) : null}
      {presentPlay ? (
        <PresentationOverlay
          play={presentPlay}
          onClose={() => setPresentPlay(null)}
        />
      ) : null}
      {selected && addPlayOpen ? (
        <AddPlayToPlaybookModal
          open={addPlayOpen}
          playbookName={selected.name}
          excludedPlayIds={excludedPlayIds}
          onClose={() => setAddPlayOpen(false)}
          onAdd={(playIds) => void handleAddPlays(playIds)}
        />
      ) : null}
    </>
  );
}
