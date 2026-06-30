"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FdImportPanelHandle } from "@/components/library/FdImportPanel";
import { FdImportPanel } from "@/components/library/FdImportPanel";
import {
  LibraryCleanPanel,
  LibraryCleanToggle,
} from "@/components/library/LibraryCleanPanel";
import { LibraryFilterFields } from "@/components/library/LibraryFilterFields";
import {
  DuplicateMergeModal,
  findDuplicateGroups,
} from "@/components/library/DuplicateMergeModal";
import { PresentationOverlay } from "@/components/library/PresentationOverlay";
import { useLibrarySplitResizer } from "@/hooks/useLibrarySplitResizer";
import {
  matchesLibraryCleanFilter,
  type LibraryCleanFilter,
} from "@/lib/library/library-clean";
import {
  getLibraryReviewQueue,
  resetLibraryReviewRecords,
  setLibraryReviewRecord,
} from "@/lib/library/library-review";
import { LibraryPreviewPanel } from "@/components/library/LibraryPreviewPanel";
import { LibraryPrintOverlay } from "@/components/library/LibraryPrintOverlay";
import { LibraryTable } from "@/components/library/LibraryTable";
import { LibraryTypeBar } from "@/components/library/LibraryTypeBar";
import { AddToPlaybookModal } from "@/components/library/AddToPlaybookModal";
import { LibrarySortControl, useLibrarySortId } from "@/components/library/LibrarySortControl";
import {
  LibraryPlayContextMenu,
  type LibraryPlayContextMenuState,
} from "@/components/library/LibraryPlayContextMenu";
import { compareLibraryItems } from "@/lib/library/library-sort";
import {
  canShowLibraryCreatedByColumn,
  loadCreatorNameIndex,
} from "@/lib/library/play-creator-label";
import {
  PlayDetailsModal,
  type PlayDetailsValues,
} from "@/components/library/PlayDetailsModal";
import { useAuthStore } from "@/stores/auth-store";
import { useLibraryStore } from "@/stores/library-store";
import { useOrganizerStore } from "@/stores/organizer-store";
import {
  appConfirm,
  appNotice,
  appPlaybookName,
  appPrompt,
} from "@/stores/dialog-store";

const PAGE_SIZE = 50;

export function DrawLibraryView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useAuthStore((s) => s.session);
  const importPanelRef = useRef<FdImportPanelHandle>(null);
  const items = useLibraryStore((s) => s.items);
  const libraryHydrated = useLibraryStore((s) => s.hydrated);
  const createPlayFromDetails = useLibraryStore((s) => s.createPlayFromDetails);
  const getPlayDocument = useLibraryStore((s) => s.getPlayDocument);
  const removePlay = useLibraryStore((s) => s.removePlay);
  const duplicatePlay = useLibraryStore((s) => s.duplicatePlay);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const savePlayDocument = useLibraryStore((s) => s.savePlayDocument);
  const playbooks = useOrganizerStore((s) => s.playbooks);
  const teamsMeta = useOrganizerStore((s) => s.teams);
  const seriesMeta = useOrganizerStore((s) => s.series);
  const createPracticeSession = useOrganizerStore((s) => s.createPracticeSession);
  const addPracticeItems = useOrganizerStore((s) => s.addPracticeItems);
  const updatePracticeSession = useOrganizerStore((s) => s.updatePracticeSession);
  const { resizerProps } = useLibrarySplitResizer();
  const addPlayToPlaybook = useOrganizerStore((s) => s.addPlayToPlaybook);
  const createPlaybook = useOrganizerStore((s) => s.createPlaybook);

  const [sortId, setSortId] = useLibrarySortId();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("");
  const [tagsFilter, setTagsFilter] = useState("");
  const showCreatedBy = canShowLibraryCreatedByColumn(session?.user);
  const [creatorNames, setCreatorNames] = useState<Map<string, string>>(() => new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [selectedPlay, setSelectedPlay] = useState<Awaited<
    ReturnType<typeof getPlayDocument>
  > | null>(null);
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [addPlaybookOpen, setAddPlaybookOpen] = useState(false);
  const [printPlay, setPrintPlay] = useState<Awaited<
    ReturnType<typeof getPlayDocument>
  > | null>(null);
  const [cleanOpen, setCleanOpen] = useState(false);
  const [cleanFilter, setCleanFilter] = useState<LibraryCleanFilter>("off");
  const [dupMergeOpen, setDupMergeOpen] = useState(false);
  const [presentPlay, setPresentPlay] = useState<Awaited<
    ReturnType<typeof getPlayDocument>
  > | null>(null);
  const [contextMenu, setContextMenu] = useState<LibraryPlayContextMenuState | null>(
    null,
  );

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    let openNewTimer: number | undefined;

    if (params.get("new") === "1") {
      openNewTimer = window.setTimeout(() => setCreateModalOpen(true), 0);
      params.delete("new");
      changed = true;
    }

    if (params.get("import") === "1") {
      importPanelRef.current?.openPicker();
      params.delete("import");
      changed = true;
    }

    if (changed) {
      const qs = params.toString();
      router.replace(qs ? `/library?${qs}` : "/library", { scroll: false });
    }

    return () => {
      if (openNewTimer !== undefined) window.clearTimeout(openNewTimer);
    };
  }, [router, searchParams]);

  useEffect(() => {
    if (!showCreatedBy) return;
    let active = true;
    void loadCreatorNameIndex(session?.user).then((names) => {
      if (active) setCreatorNames(names);
    });
    return () => {
      active = false;
    };
  }, [showCreatedBy, session?.user]);

  const assignedPlayIds = useMemo(() => {
    const ids = new Set<string>();
    for (const book of playbooks) {
      for (const id of book.playRefs) ids.add(id);
    }
    return ids;
  }, [playbooks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seasonQ = seasonFilter.trim().toLowerCase();
    const typeQ = typeFilter.trim().toLowerCase();
    const teamQ = teamFilter.trim().toLowerCase();
    const seriesQ = seriesFilter.trim().toLowerCase();
    const tagsQ = tagsFilter.trim().toLowerCase();

    const list = items.filter((item) => {
      if (
        !matchesLibraryCleanFilter(
          item,
          cleanFilter,
          items,
          assignedPlayIds,
        )
      ) {
        return false;
      }
      if (filter === "favorites" && !item.favorite) return false;
      if (
        filter !== "all" &&
        filter !== "favorites" &&
        item.type !== filter
      ) {
        return false;
      }
      if (seasonQ && !(item.season || "").toLowerCase().includes(seasonQ)) {
        return false;
      }
      if (typeQ && !item.type.toLowerCase().includes(typeQ)) return false;
      if (teamQ && !(item.team || "").toLowerCase().includes(teamQ)) return false;
      if (seriesQ && !(item.series || "").toLowerCase().includes(seriesQ)) {
        return false;
      }
      if (
        tagsQ &&
        !item.tags.some((t) => t.toLowerCase().includes(tagsQ))
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.team || "").toLowerCase().includes(q) ||
        (item.series || "").toLowerCase().includes(q) ||
        item.tags.some((t) => t.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) =>
      compareLibraryItems(a, b, sortId, filter === "all"),
    );
  }, [
    items,
    filter,
    query,
    seasonFilter,
    typeFilter,
    teamFilter,
    seriesFilter,
    tagsFilter,
    cleanFilter,
    assignedPlayIds,
    sortId,
  ]);

  async function sharePlayLink(play: NonNullable<typeof previewPlay>) {
    const doc = selectedPlay ?? (await getPlayDocument(play.id));
    if (!doc) {
      appNotice(
        "Share failed",
        "Could not load play for sharing.",
      );
      return;
    }
    const { buildSmartPlayUrl, copyShareResult } = await import(
      "@/lib/share/share-link"
    );
    const result = buildSmartPlayUrl(doc, { playerView: false });
    await copyShareResult(result, play.title);
  }

  async function sendPlayToPlayers(play: NonNullable<typeof previewPlay>) {
    const doc = selectedPlay ?? (await getPlayDocument(play.id));
    if (!doc) {
      appNotice(
        "Share failed",
        "Could not load play for sharing.",
      );
      return;
    }
    const { sharePlaysAsPlaybookToPlayers } = await import(
      "@/lib/players/share-to-players"
    );
    sharePlaysAsPlaybookToPlayers([doc], {
      team: doc.team,
      name: doc.title || "Playbook",
      subtitle: "1 play",
    });
  }

  useEffect(() => {
    if (!previewId || !libraryHydrated) return;
    let active = true;
    void getPlayDocument(previewId).then((play) => {
      if (active) setSelectedPlay(play ?? null);
    });
    return () => {
      active = false;
    };
  }, [previewId, getPlayDocument, libraryHydrated]);

  const itemIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const effectiveSelectedIds = useMemo(() => {
    const next = new Set([...selectedIds].filter((id) => itemIds.has(id)));
    return next.size === selectedIds.size ? selectedIds : next;
  }, [itemIds, selectedIds]);
  const effectivePreviewId =
    previewId && itemIds.has(previewId) ? previewId : null;
  const previewPlay = effectivePreviewId ? (selectedPlay ?? null) : null;

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(filtered.map((item) => item.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function handleCreate() {
    setCreateModalOpen(true);
  }

  async function handleNewPracticeFromSelection() {
    const ids = [...effectiveSelectedIds];
    if (!ids.length) return;
    const session = await createPracticeSession();
    await addPracticeItems(session.id, ids);
    const label =
      ids.length === 1
        ? items.find((item) => item.id === ids[0])?.title?.trim()
        : `${ids.length} plays`;
    if (label) {
      await updatePracticeSession(session.id, {
        title: `Practice — ${label}`,
      });
    }
    router.push(`/library?tab=practice&session=${session.id}`);
  }

  async function handleCreateSubmit(details: PlayDetailsValues) {
    setCreating(true);
    try {
      const play = await createPlayFromDetails(details);
      setCreateModalOpen(false);
      setPreviewId(play.id);
      setSelectedIds(new Set([play.id]));
      router.push(`/designer?item=${play.id}`);
    } finally {
      setCreating(false);
    }
  }

  const cleanMatches = useMemo(
    () =>
      items.filter((item) =>
        matchesLibraryCleanFilter(item, cleanFilter, items, assignedPlayIds),
      ),
    [items, cleanFilter, assignedPlayIds],
  );

  const duplicateGroups = useMemo(() => findDuplicateGroups(items), [items]);

  const teamOptions = useMemo(() => {
    const set = new Set(teamsMeta);
    for (const item of items) {
      if (item.team?.trim()) set.add(item.team.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [teamsMeta, items]);

  const seriesOptions = useMemo(() => {
    const set = new Set(seriesMeta);
    for (const item of items) {
      if (item.series?.trim()) set.add(item.series.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [seriesMeta, items]);

  function resolveContextTargetIds(playId: string) {
    if (effectiveSelectedIds.has(playId) && effectiveSelectedIds.size > 0) {
      return [...effectiveSelectedIds];
    }
    return [playId];
  }

  function handleRowContextMenu(
    playId: string,
    e: MouseEvent<HTMLTableRowElement>,
  ) {
    e.preventDefault();
    setPreviewId(playId);
    setSelectedIds((prev) => (prev.has(playId) ? prev : new Set([playId])));
    setContextMenu({ x: e.clientX, y: e.clientY, playId });
  }

  async function applyFieldToPlays(
    targetIds: string[],
    patch: (play: NonNullable<Awaited<ReturnType<typeof getPlayDocument>>>) => Partial<
      NonNullable<Awaited<ReturnType<typeof getPlayDocument>>>
    >,
  ) {
    for (const id of targetIds) {
      const play = await getPlayDocument(id);
      if (!play) continue;
      await savePlayDocument({
        ...play,
        ...patch(play),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async function handleContextOpenPlay(playId: string) {
    router.push(`/designer?item=${playId}`);
  }

  async function handleContextDuplicate(playId: string) {
    const targetIds = resolveContextTargetIds(playId);
    let lastCopyId: string | null = null;
    for (const id of targetIds) {
      const copy = await duplicatePlay(id);
      if (copy) lastCopyId = copy.id;
    }
    if (lastCopyId) {
      setPreviewId(lastCopyId);
      setSelectedIds(new Set([lastCopyId]));
    }
  }

  async function handleContextChangeTeam(playId: string, team: string) {
    const targetIds = resolveContextTargetIds(playId);
    await applyFieldToPlays(targetIds, () => ({ team }));
  }

  async function handleContextChangeSeries(playId: string, series: string) {
    const targetIds = resolveContextTargetIds(playId);
    await applyFieldToPlays(targetIds, () => ({ series }));
  }

  async function handleContextCreatePlaybook(playId: string) {
    const targetIds = resolveContextTargetIds(playId);
    const first = await getPlayDocument(targetIds[0]);
    const result = await appPlaybookName({
      mode: "create",
      initialTeam: first?.team?.trim() || teamsMeta[0] || "No Team",
      teams: teamsMeta,
      existingNames: playbooks.map((pb) => pb.name),
    });
    if (!result) return;
    const pb = await createPlaybook(result.name, result.team);
    for (const id of targetIds) {
      await addPlayToPlaybook(pb.id, id);
    }
  }

  async function handleContextDelete(playId: string) {
    const targetIds = resolveContextTargetIds(playId);
    const count = targetIds.length;
    const message =
      count === 1
        ? `Delete "${items.find((i) => i.id === targetIds[0])?.title ?? "this play"}"? This cannot be undone.`
        : `Delete ${count} selected items? This cannot be undone.`;
    const confirmed = await appConfirm({
      title: "Delete play",
      message,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    for (const id of targetIds) {
      await removePlay(id);
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of targetIds) next.delete(id);
      return next;
    });
    if (previewId && targetIds.includes(previewId)) {
      setPreviewId(null);
      setSelectedPlay(null);
    }
  }

  async function handleAutoCategorize() {
    const targets = items.filter(
      (item) =>
        matchesLibraryCleanFilter(item, "misc", items, assignedPlayIds) ||
        matchesLibraryCleanFilter(item, "no-team", items, assignedPlayIds),
    );
    for (const item of targets) {
      const doc = await getPlayDocument(item.id);
      if (!doc) continue;
      await savePlayDocument({
        ...doc,
        team: doc.team?.trim() ? doc.team : "Miscellaneous",
        tags: doc.tags.includes("misc") ? doc.tags : [...doc.tags, "misc"],
      });
    }
    appNotice(
      "Plays updated",
      `Updated ${targets.length} play(s).`,
    );
  }

  function handleReviewNext() {
    const queue = getLibraryReviewQueue(items.map((i) => i.id));
    const nextId = queue.pending[0];
    if (!nextId) return;
    setPreviewId(nextId);
  }

  async function handleMarkReviewed() {
    if (!previewId) return;
    const note = await appPrompt({
      title: "Mark as reviewed",
      subtitle: "Optional note for your library review log.",
      label: "Review note",
      placeholder: "Optional note…",
      submitLabel: "Mark reviewed",
      allowEmpty: true,
    });
    if (note === null) return;
    setLibraryReviewRecord(previewId, "ok", note);
  }

  async function handleClearReviewRecords() {
    const confirmed = await appConfirm({
      title: "Clear review records",
      message: "Clear all review records? This cannot be undone.",
      confirmLabel: "Clear all",
      danger: true,
    });
    if (!confirmed) return;
    resetLibraryReviewRecords();
  }

  return (
    <>
      <LibraryFilterFields
        season={seasonFilter}
        type={typeFilter}
        team={teamFilter}
        series={seriesFilter}
        tags={tagsFilter}
        playName={query}
        onSeasonChange={(value) => {
          setSeasonFilter(value);
          setPage(0);
        }}
        onTypeChange={(value) => {
          setTypeFilter(value);
          setPage(0);
        }}
        onTeamChange={(value) => {
          setTeamFilter(value);
          setPage(0);
        }}
        onSeriesChange={(value) => {
          setSeriesFilter(value);
          setPage(0);
        }}
        onTagsChange={(value) => {
          setTagsFilter(value);
          setPage(0);
        }}
        onPlayNameChange={(value) => {
          setQuery(value);
          setPage(0);
        }}
        onCreate={handleCreate}
        onImport={() => importPanelRef.current?.openPicker()}
        sortSlot={
          <LibrarySortControl sortId={sortId} onSortChange={setSortId} />
        }
        cleanSlot={
          <LibraryCleanToggle
            open={cleanOpen}
            onToggle={() => setCleanOpen((v) => !v)}
          />
        }
        creating={creating}
      />
      <FdImportPanel ref={importPanelRef} />
      <LibraryCleanPanel
        open={cleanOpen}
        filter={cleanFilter}
        items={items}
        assignedPlayIds={assignedPlayIds}
        previewId={previewId}
        onFilterChange={(next) => {
          setCleanFilter(next);
          setPage(0);
        }}
        onOpenFirst={() => {
          const first = cleanMatches[0];
          if (!first) return;
          setPreviewId(first.id);
          router.push(`/designer?item=${first.id}`);
        }}
        onSelectMatches={() => {
          setSelectedIds(new Set(cleanMatches.map((i) => i.id)));
        }}
        onReviewNext={handleReviewNext}
        onMarkReviewed={handleMarkReviewed}
        onReviewDuplicates={() => setDupMergeOpen(true)}
        onAutoCategorize={() => void handleAutoCategorize()}
        onResetReviewed={() => void handleClearReviewRecords()}
        onClose={() => {
          setCleanOpen(false);
          setCleanFilter("off");
        }}
      />
      <LibraryTypeBar
        active={filter}
        onChange={(value) => {
          setFilter(value);
          setPage(0);
        }}
      />
      <div className="org-library-split fd-library-split" id="org-library-split">
        <LibraryTable
          items={filtered}
          selectedIds={effectiveSelectedIds}
          previewId={previewId}
          onToggleRow={toggleRow}
          onToggleAllFiltered={toggleAllFiltered}
          onPreview={setPreviewId}
          onRowContextMenu={handleRowContextMenu}
          page={page}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          onNewPractice={() => void handleNewPracticeFromSelection()}
          showCreatedBy={showCreatedBy}
          creatorNames={creatorNames}
        />
        <div {...resizerProps} id="org-split-resizer" />
        <LibraryPreviewPanel
          play={previewPlay}
          onEditDetails={
            previewPlay ? () => setEditDetailsOpen(true) : undefined
          }
          onDuplicate={
            previewId && previewPlay
              ? async () => {
                  const copy = await duplicatePlay(previewId);
                  if (!copy) return;
                  setPreviewId(copy.id);
                  setSelectedIds(new Set([copy.id]));
                  setSelectedPlay(copy);
                }
              : undefined
          }
          onAddToPlaybook={
            previewPlay ? () => setAddPlaybookOpen(true) : undefined
          }
          onPresent={
            previewPlay ? () => setPresentPlay(previewPlay) : undefined
          }
          onTogglePin={
            previewId ? () => void toggleFavorite(previewId) : undefined
          }
          onShare={previewPlay ? () => void sharePlayLink(previewPlay) : undefined}
          onSendToPlayers={
            previewPlay ? () => void sendPlayToPlayers(previewPlay) : undefined
          }
          onPrint={previewPlay ? () => setPrintPlay(previewPlay) : undefined}
        />
      </div>
      {contextMenu ? (
        <LibraryPlayContextMenu
          menu={contextMenu}
          targetCount={resolveContextTargetIds(contextMenu.playId).length}
          teams={teamOptions}
          series={seriesOptions}
          onClose={() => setContextMenu(null)}
          onOpenPlay={() => void handleContextOpenPlay(contextMenu.playId)}
          onDuplicate={() => void handleContextDuplicate(contextMenu.playId)}
          onEditDetails={() => setEditDetailsOpen(true)}
          onChangeTeam={(team) =>
            void handleContextChangeTeam(contextMenu.playId, team)
          }
          onChangeSeries={(series) =>
            void handleContextChangeSeries(contextMenu.playId, series)
          }
          onCreatePlaybook={() =>
            void handleContextCreatePlaybook(contextMenu.playId)
          }
          onDelete={() => void handleContextDelete(contextMenu.playId)}
        />
      ) : null}
      {printPlay ? (
        <LibraryPrintOverlay
          play={printPlay}
          onClose={() => setPrintPlay(null)}
        />
      ) : null}
      {presentPlay ? (
        <PresentationOverlay
          play={presentPlay}
          onClose={() => setPresentPlay(null)}
        />
      ) : null}
      <DuplicateMergeModal
        open={dupMergeOpen}
        groups={duplicateGroups}
        onClose={() => setDupMergeOpen(false)}
        onMerge={async (keeperId, removeIds) => {
          for (const id of removeIds) await removePlay(id);
          setPreviewId(keeperId);
          setDupMergeOpen(false);
        }}
      />
      <PlayDetailsModal
        open={createModalOpen}
        mode="create"
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
      />
      {previewPlay ? (
        <AddToPlaybookModal
          open={addPlaybookOpen}
          playbooks={playbooks}
          playTitle={previewPlay.title}
          onClose={() => setAddPlaybookOpen(false)}
          onSelect={(playbookId) => {
            void addPlayToPlaybook(playbookId, previewPlay.id);
          }}
        />
      ) : null}
      {previewPlay ? (
        <PlayDetailsModal
          open={editDetailsOpen}
          mode="edit"
          initial={{
            type: previewPlay.type,
            title: previewPlay.title,
            team: previewPlay.team,
            series: previewPlay.series,
            tags: previewPlay.tags,
            courtType: previewPlay.courtType,
            courtView: previewPlay.courtView,
            season: previewPlay.season,
            playNotes: previewPlay.playNotes,
            videoUrl: previewPlay.videoUrl,
          }}
          onClose={() => setEditDetailsOpen(false)}
          onSubmit={async (details) => {
            const updated = {
              ...previewPlay,
              title: details.title,
              type: details.type,
              team: details.team,
              series: details.series,
              tags: details.tags,
              courtType: details.courtType,
              courtView: details.courtView,
              season: details.season,
              playNotes: details.playNotes || undefined,
              videoUrl: details.videoUrl || undefined,
              updatedAt: new Date().toISOString(),
            };
            await savePlayDocument(updated);
            setSelectedPlay(updated);
            setEditDetailsOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
