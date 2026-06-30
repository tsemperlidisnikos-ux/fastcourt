"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useClientMounted } from "@/hooks/useClientMounted";
import { LibraryFilterFields } from "@/components/library/LibraryFilterFields";
import { LibraryTable } from "@/components/library/LibraryTable";
import { LibrarySortControl, useLibrarySortId } from "@/components/library/LibrarySortControl";
import { compareLibraryItems } from "@/lib/library/library-sort";
import type { LibraryItem, StoredPlay } from "@/types/library";

const PAGE_SIZE = 50;

interface Props {
  open: boolean;
  plays: StoredPlay[];
  existingPlayIds?: Set<string>;
  mode?: "add" | "replace";
  onClose: () => void;
  onConfirm: (playIds: string[]) => void;
}

function toLibraryItems(plays: StoredPlay[]): LibraryItem[] {
  return plays.map((play) => ({
    id: play.id,
    title: play.title,
    type: play.type,
    season: play.season,
    team: play.team,
    series: play.series,
    tags: play.tags,
    frameCount: play.frames.length,
    updatedAt: play.updatedAt,
    favorite: play.favorite,
    source: play.source,
    lazyPending: play.lazyPending,
  }));
}

export function PracticeAddModal(props: Props) {
  const mounted = useClientMounted();
  if (!props.open || !mounted) return null;
  return <PracticeAddModalBody {...props} />;
}

function PracticeAddModalBody({
  plays,
  existingPlayIds = new Set(),
  mode = "add",
  onClose,
  onConfirm,
}: Props) {
  const isReplace = mode === "replace";
  const [sortId, setSortId] = useLibrarySortId();
  const [query, setQuery] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [seriesFilter, setSeriesFilter] = useState("");
  const [tagsFilter, setTagsFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    setQuery("");
    setSeasonFilter("");
    setTypeFilter("");
    setTeamFilter("");
    setSeriesFilter("");
    setTagsFilter("");
    setSelectedIds(new Set());
    setPreviewId(null);
    setPage(0);
  }, [mode]);

  const libraryItems = useMemo(() => toLibraryItems(plays), [plays]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seasonQ = seasonFilter.trim().toLowerCase();
    const typeQ = typeFilter.trim().toLowerCase();
    const teamQ = teamFilter.trim().toLowerCase();
    const seriesQ = seriesFilter.trim().toLowerCase();
    const tagsQ = tagsFilter.trim().toLowerCase();

    const list = libraryItems.filter((item) => {
      if (item.type === "playbook") return false;
      if (!isReplace && existingPlayIds.has(item.id)) return false;
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
        !item.tags.some((tag) => tag.toLowerCase().includes(tagsQ))
      ) {
        return false;
      }
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        (item.team || "").toLowerCase().includes(q) ||
        (item.series || "").toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    });

    return [...list].sort((a, b) => compareLibraryItems(a, b, sortId, true));
  }, [
    libraryItems,
    existingPlayIds,
    isReplace,
    query,
    seasonFilter,
    typeFilter,
    teamFilter,
    seriesFilter,
    tagsFilter,
    sortId,
  ]);

  function toggleRow(id: string) {
    if (isReplace) {
      setSelectedIds((prev) => (prev.has(id) ? new Set() : new Set([id])));
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered(checked: boolean) {
    if (isReplace) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of filtered) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  }

  function handleRowPreview(id: string) {
    setPreviewId(id);
    toggleRow(id);
  }

  function handleConfirm() {
    if (!selectedIds.size) return;
    onConfirm([...selectedIds]);
    onClose();
  }

  const emptyMessage = isReplace
    ? "No plays or drills in your library."
    : libraryItems.some(
          (item) => item.type !== "playbook" && !existingPlayIds.has(item.id),
        )
      ? "No plays match your filters."
      : "All library items are already in this session.";

  return createPortal(
    <div
      className="modal-overlay active fc-add-play-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-box modal-box-wide fc-add-play-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-add-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title" id="practice-add-modal-title">
          {isReplace ? "Replace missing play" : "Add to practice session"}
        </div>
        <p className="modal-subtitle">
          {isReplace
            ? "This block links to a play that was removed from your library. Pick a replacement."
            : "Select plays and drills from your library."}
        </p>
        <div className="fd-ui fc-add-play-modal">
          <LibraryFilterFields
            season={seasonFilter}
            type={typeFilter}
            team={teamFilter}
            series={seriesFilter}
            tags={tagsFilter}
            playName={query}
            showCreate={false}
            showImport={false}
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
            sortSlot={
              <LibrarySortControl sortId={sortId} onSortChange={setSortId} />
            }
          />
          <div className="fc-add-play-modal-table-wrap">
            {!filtered.length ? (
              <div className="fc-add-play-modal-empty">{emptyMessage}</div>
            ) : (
              <LibraryTable
                items={filtered}
                selectedIds={selectedIds}
                previewId={previewId}
                selectionMode={isReplace ? "single" : "multi"}
                onToggleRow={toggleRow}
                onToggleAllFiltered={toggleAllFiltered}
                onPreview={handleRowPreview}
                page={page}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            )}
          </div>
        </div>
        <div className="modal-actions fc-add-play-modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="modal-create"
            disabled={!selectedIds.size}
            onClick={handleConfirm}
          >
            {isReplace
              ? "Replace block"
              : `Add to session${selectedIds.size ? ` (${selectedIds.size})` : ""}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
