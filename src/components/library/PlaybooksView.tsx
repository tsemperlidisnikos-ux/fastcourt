"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { DownloadIcon } from "@/components/library/DownloadIcon";
import { GoogleDriveAddIcon } from "@/components/library/GoogleDriveAddIcon";
import { PrintPreviewIcon } from "@/components/library/PrintPreviewIcon";
import { LibraryPrintOverlay } from "@/components/library/LibraryPrintOverlay";
import { PlaybookInlinePreview } from "@/components/library/PlaybookInlinePreview";
import { PlaybookPrintOverlay } from "@/components/library/PlaybookPrintOverlay";
import { AddPlayToPlaybookModal } from "@/components/library/AddPlayToPlaybookModal";
import { PlaybookPlaysList } from "@/components/library/PlaybookPlaysList";
import {
  PlaybookContextMenu,
  type PlaybookContextMenuState,
} from "@/components/library/PlaybookContextMenu";
import { PlaybookRemovePlayDialog } from "@/components/library/PlaybookDialogs";
import { shareContentToPlayers } from "@/lib/players/share-to-players";
import { syncLibraryForUser } from "@/lib/cloud/library-sync";
import { canAddItemToPlaybook } from "@/lib/library/counter-library-badge";
import { FC_CONTEXT_MENU_TRIGGER_ATTR } from "@/lib/ui/context-menu-policy";
import { useAuthStore } from "@/stores/auth-store";
import { useOrganizerStore } from "@/stores/organizer-store";
import {
  appConfirm,
  appNotice,
  appPlaybookName,
} from "@/stores/dialog-store";
import { usePlaybookPrintConfigStore } from "@/stores/playbook-print-config-store";
import {
  buildPlaybookPageList,
  DEFAULT_PLAYBOOK_PRINT_SETTINGS,
  findPlaybookPageIndexForPlay,
} from "@/lib/library/playbook-print";
import { toPlaybookPrintSettings } from "@/lib/library/playbook-print-config";
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
  const playbooks = useOrganizerStore((s) => s.playbooks);
  const plays = useOrganizerStore((s) => s.plays);
  const teams = useOrganizerStore((s) => s.teams);
  const createPlaybook = useOrganizerStore((s) => s.createPlaybook);
  const updatePlaybook = useOrganizerStore((s) => s.updatePlaybook);
  const reorderPlaybookPlays = useOrganizerStore((s) => s.reorderPlaybookPlays);
  const deletePlaybook = useOrganizerStore((s) => s.deletePlaybook);
  const addPlayToPlaybook = useOrganizerStore((s) => s.addPlayToPlaybook);
  const removePlayFromPlaybook = useOrganizerStore((s) => s.removePlayFromPlaybook);
  const resolvePlaybookPlays = useOrganizerStore((s) => s.resolvePlaybookPlays);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [printPlay, setPrintPlay] = useState<StoredPlay | null>(null);
  const [printPlaybookOpen, setPrintPlaybookOpen] = useState(false);
  const [autoPrintPlaybook, setAutoPrintPlaybook] = useState(false);
  const [cloudSyncing, setCloudSyncing] = useState(false);
  const [contextMenu, setContextMenu] = useState<PlaybookContextMenuState | null>(null);
  const [selectedPlayId, setSelectedPlayId] = useState<string | null>(null);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [previewZoomPct, setPreviewZoomPct] = useState(80);
  const [focusPageIndex, setFocusPageIndex] = useState<number | null>(null);
  const [addPlayOpen, setAddPlayOpen] = useState(false);
  const [removePlayTarget, setRemovePlayTarget] = useState<{
    playId: string;
    playTitle: string;
  } | null>(null);

  const session = useAuthStore((s) => s.session);

  const printConfig = usePlaybookPrintConfigStore((s) => s.config);
  const printConfigHydrated = usePlaybookPrintConfigStore((s) => s.hydrated);
  const hydratePrintConfig = usePlaybookPrintConfigStore((s) => s.hydrate);

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

  const printSettings = useMemo(
    () => ({
      ...DEFAULT_PLAYBOOK_PRINT_SETTINGS,
      ...toPlaybookPrintSettings(printConfig),
    }),
    [printConfig],
  );

  const playbookPages = useMemo(() => {
    if (!selectedPlays.length) return [];
    return buildPlaybookPageList(selectedPlays, printSettings).pages;
  }, [selectedPlays, printSettings]);

  useEffect(() => {
    if (!printConfigHydrated) hydratePrintConfig();
  }, [printConfigHydrated, hydratePrintConfig]);

  useEffect(() => {
    if (!playbookPages.length) {
      setSelectedPageIndex(0);
      return;
    }
    setSelectedPageIndex((current) =>
      Math.min(Math.max(0, current), playbookPages.length - 1),
    );
  }, [playbookPages.length, selected?.id]);

  const totalPages = Math.max(1, Math.ceil(playbooks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = playbooks.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );
  const from = playbooks.length ? safePage * PAGE_SIZE + 1 : 0;
  const to = Math.min(playbooks.length, (safePage + 1) * PAGE_SIZE);

  const availablePlays = useMemo(
    () => plays.filter((p) => canAddItemToPlaybook(p) && p.type !== "playbook"),
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

  async function handleOpenRenamePlaybook(playbookId: string) {
    const playbook = playbooks.find((pb) => pb.id === playbookId);
    if (!playbook) return;
    const result = await appPlaybookName({
      mode: "rename",
      initialName: playbook.name,
      initialTeam: playbook.team,
      teams,
      existingNames: playbooks
        .filter((pb) => pb.id !== playbook.id)
        .map((pb) => pb.name),
    });
    if (!result) return;
    await updatePlaybook(playbook.id, { name: result.name });
  }

  async function handleOpenDeletePlaybook(playbookId: string) {
    const playbook = playbooks.find((pb) => pb.id === playbookId);
    if (!playbook) return;
    const playCount = playbook.playRefs.length;
    const confirmed = await appConfirm({
      title: "Delete playbook",
      message: `Delete "${playbook.name}"?${playCount > 0 ? ` This playbook contains ${playCount} play${playCount === 1 ? "" : "s"}.` : ""} This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    await handleDeletePlaybook(playbookId);
  }

  async function handleAddPlays(playIds: string[]) {
    if (!selected) return;
    for (const playId of playIds) {
      await addPlayToPlaybook(selected.id, playId);
    }
    const lastPlayId = playIds[playIds.length - 1];
    if (lastPlayId) {
      setSelectedPlayId(lastPlayId);
      const nextPlays = resolvePlaybookPlays({
        ...selected,
        playRefs: [...selected.playRefs, ...playIds],
      });
      const pages = buildPlaybookPageList(
        nextPlays,
        printSettings,
      ).pages;
      const pageIndex = findPlaybookPageIndexForPlay(pages, lastPlayId);
      setSelectedPageIndex(pageIndex);
      setFocusPageIndex(pageIndex);
    }
  }

  function handleSelectPlaybookPage(index: number) {
    setSelectedPageIndex(index);
    const page = playbookPages[index];
    if (page?.playId) {
      setSelectedPlayId(page.playId);
    }
  }

  function handleSelectPlay(playId: string) {
    const pageIndex = findPlaybookPageIndexForPlay(playbookPages, playId);
    setSelectedPlayId(playId);
    setSelectedPageIndex(pageIndex);
    setFocusPageIndex(pageIndex);
  }

  function handleReorderPlays(fromIndex: number, toIndex: number) {
    if (!selected) return;
    void reorderPlaybookPlays(selected.id, fromIndex, toIndex);
  }

  function handleRequestRemovePlay(playId: string) {
    const play = selectedPlays.find((item) => item.id === playId);
    if (!play) return;
    setRemovePlayTarget({
      playId,
      playTitle: play.title?.trim() || "Untitled",
    });
  }

  async function handleConfirmRemovePlay() {
    if (!selected || !removePlayTarget) return;
    const { playId } = removePlayTarget;
    const nextPlays = selectedPlays.filter((play) => play.id !== playId);
    await removePlayFromPlaybook(selected.id, playId);
    if (activePlayId === playId) {
      const nextPlayId = nextPlays[0]?.id ?? null;
      setSelectedPlayId(nextPlayId);
      if (nextPlayId) {
        const pages = buildPlaybookPageList(nextPlays, printSettings).pages;
        const pageIndex = findPlaybookPageIndexForPlay(pages, nextPlayId);
        setSelectedPageIndex(pageIndex);
        setFocusPageIndex(pageIndex);
      } else {
        setSelectedPageIndex(0);
        setFocusPageIndex(null);
      }
    }
    setRemovePlayTarget(null);
  }

  async function handleDeletePlaybook(playbookId: string) {
    await deletePlaybook(playbookId);
    if (selectedId === playbookId) {
      setSelectedId(null);
    }
  }

  function handlePlaybookContextMenu(
    playbookId: string,
    e: MouseEvent<HTMLButtonElement>,
  ) {
    e.preventDefault();
    setSelectedId(playbookId);
    setContextMenu({ x: e.clientX, y: e.clientY, playbookId });
  }

  function handlePrintPreview() {
    if (!selected || !selectedPlays.length) return;
    setAutoPrintPlaybook(false);
    setPrintPlaybookOpen(true);
  }

  function handleDownloadPdf() {
    if (!selected || !selectedPlays.length) return;
    setAutoPrintPlaybook(true);
    setPrintPlaybookOpen(true);
  }

  async function handleSaveToCloud() {
    if (!session?.cloud) {
      appNotice("Cloud save", "Sign in with cloud mode to save your library.");
      return;
    }
    setCloudSyncing(true);
    try {
      const result = await syncLibraryForUser(session.user);
      if (!result.ok) {
        appNotice("Cloud save", result.error);
        return;
      }
      appNotice(
        "Cloud save",
        `Saved ${result.result.playCount} plays and ${result.result.playbookCount} playbooks to your account.`,
      );
    } finally {
      setCloudSyncing(false);
    }
  }

  const detailState = !selected
    ? "pick-playbook"
    : !selectedPlays.length
      ? "empty"
      : "split";

  return (
    <>
      <div className="fc-playbooks-shell" id="fc-playbooks-shell">
        <aside className="fc-playbooks-sidebar" id="fc-playbooks-sidebar" aria-label="Playbooks">
          <div className="fc-playbooks-sidebar-toolbar">
            <button
              type="button"
              className="fc-playbooks-create-btn"
              id="btn-playbooks-create-playbook"
              onClick={() => void handleOpenCreatePlaybook()}
            >
              ADD PLAYBOOK
            </button>
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
                    {...{ [FC_CONTEXT_MENU_TRIGGER_ATTR]: "" }}
                    onClick={() => setSelectedId(section.id)}
                    onContextMenu={(e) => handlePlaybookContextMenu(section.id, e)}
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
                className="fc-playbooks-toolbar-icon-btn"
                id="btn-playbooks-save-cloud"
                title="Save to cloud"
                aria-label="Save to cloud"
                disabled={cloudSyncing || !selected}
                onClick={() => void handleSaveToCloud()}
              >
                <GoogleDriveAddIcon size={18} />
              </button>
              <button
                type="button"
                className="fc-playbooks-toolbar-icon-btn"
                id="btn-playbooks-download-pdf"
                title="Download PDF"
                aria-label="Download PDF"
                disabled={!selected || !selectedPlays.length}
                onClick={handleDownloadPdf}
              >
                <DownloadIcon size={18} />
              </button>
              <button
                type="button"
                className={`fc-playbooks-preview-btn${printPlaybookOpen ? " active" : ""}`}
                id="btn-playbooks-preview"
                title="Print / preview layout"
                aria-label="Print preview"
                aria-pressed={printPlaybookOpen}
                disabled={!selected || !selectedPlays.length}
                onClick={handlePrintPreview}
              >
                <PrintPreviewIcon size={18} />
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
                {selected && selectedPlays.length ? (
                  <PlaybookPlaysList
                    plays={selectedPlays}
                    selectedPlayId={activePlayId}
                    onSelectPlay={handleSelectPlay}
                    onRemovePlay={handleRequestRemovePlay}
                    onReorderPlays={handleReorderPlays}
                  />
                ) : null}
                {selected ? (
                  <PlaybookInlinePreview
                    playbook={selected}
                    plays={selectedPlays}
                    printConfig={printConfig}
                    selectedPageIndex={selectedPageIndex}
                    focusPageIndex={focusPageIndex}
                    onFocusPageHandled={() => setFocusPageIndex(null)}
                    zoomPct={previewZoomPct}
                    onPageChange={handleSelectPlaybookPage}
                    onZoomChange={setPreviewZoomPct}
                  />
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
          autoPrintOnOpen={autoPrintPlaybook}
          onClose={() => {
            setPrintPlaybookOpen(false);
            setAutoPrintPlaybook(false);
          }}
        />
      ) : null}
      {printPlay ? (
        <LibraryPrintOverlay play={printPlay} onClose={() => setPrintPlay(null)} />
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
      {contextMenu ? (
        <PlaybookContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onRename={() => void handleOpenRenamePlaybook(contextMenu.playbookId)}
          onDelete={() => void handleOpenDeletePlaybook(contextMenu.playbookId)}
        />
      ) : null}
      {selected && removePlayTarget ? (
        <PlaybookRemovePlayDialog
          open
          playTitle={removePlayTarget.playTitle}
          playbookName={selected.name}
          onClose={() => setRemovePlayTarget(null)}
          onConfirm={() => void handleConfirmRemovePlay()}
        />
      ) : null}
    </>
  );
}
