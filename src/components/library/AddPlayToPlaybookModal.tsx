"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { LibraryFilterFields } from "@/components/library/LibraryFilterFields";
import { LibraryTable } from "@/components/library/LibraryTable";
import { LibrarySortControl, useLibrarySortId } from "@/components/library/LibrarySortControl";
import { compareLibraryItems } from "@/lib/library/library-sort";
import { useLibraryStore } from "@/stores/library-store";

const PAGE_SIZE = 50;

interface Props {
  open: boolean;
  playbookName: string;
  excludedPlayIds: ReadonlySet<string>;
  onClose: () => void;
  onAdd: (playIds: string[]) => void;
}

export function AddPlayToPlaybookModal({
  open,
  playbookName,
  excludedPlayIds,
  onClose,
  onAdd,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const items = useLibraryStore((s) => s.items);
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

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSeasonFilter("");
      setTypeFilter("");
      setTeamFilter("");
      setSeriesFilter("");
      setTagsFilter("");
      setSelectedIds(new Set());
      setPreviewId(null);
      setPage(0);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seasonQ = seasonFilter.trim().toLowerCase();
    const typeQ = typeFilter.trim().toLowerCase();
    const teamQ = teamFilter.trim().toLowerCase();
    const seriesQ = seriesFilter.trim().toLowerCase();
    const tagsQ = tagsFilter.trim().toLowerCase();

    const list = items.filter((item) => {
      if (item.type === "playbook") return false;
      if (excludedPlayIds.has(item.id)) return false;
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
        item.tags.some((t) => t.toLowerCase().includes(tagsQ))
      );
    });

    return [...list].sort((a, b) => compareLibraryItems(a, b, sortId, true));
  }, [
    items,
    excludedPlayIds,
    query,
    seasonFilter,
    typeFilter,
    teamFilter,
    seriesFilter,
    tagsFilter,
    sortId,
  ]);

  if (!open || !mounted) return null;

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllFiltered(checked: boolean) {
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
    onAdd([...selectedIds]);
    onClose();
  }

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
        aria-labelledby="add-play-to-playbook-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title" id="add-play-to-playbook-title">
          Add play to playbook
        </div>
        <p className="modal-subtitle">
          Choose from your library for &ldquo;{playbookName}&rdquo;.
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
              <div className="fc-add-play-modal-empty">
                {items.some(
                  (item) =>
                    item.type !== "playbook" && !excludedPlayIds.has(item.id),
                )
                  ? "No plays match your filters."
                  : "All library plays are already in this playbook."}
              </div>
            ) : (
              <LibraryTable
                items={filtered}
                selectedIds={selectedIds}
                previewId={previewId}
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
            Add {selectedIds.size ? `(${selectedIds.size})` : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
