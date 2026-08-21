"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FdAppFooter, FdAppHeader } from "@/components/library/FdAppHeader";
import { OpponentScoutPrintOverlay } from "@/components/opponent-scout/OpponentScoutPrintOverlay";
import { useLibraryNavModules } from "@/hooks/useLibraryNavModules";
import {
  createEmptyOpponentScoutPlayer,
  createEmptyOpponentScoutReport,
  deleteOpponentScoutReport,
  duplicateOpponentScoutReport,
  loadOpponentScoutReports,
  opponentScoutReportLabel,
  saveOpponentScoutReport,
} from "@/lib/opponent-scout/storage";
import { readCompressedImageDataUrl } from "@/lib/settings/logo-image";
import { isLibraryNavModuleEnabled } from "@/lib/settings/library-nav-modules";
import { appConfirm, appNotice } from "@/stores/dialog-store";
import { useSettingsStore } from "@/stores/settings-store";
import {
  OPPONENT_SCOUT_STAT_COLUMNS,
  type OpponentScoutPlayer,
  type OpponentScoutReport,
  type OpponentScoutStats,
} from "@/types/opponent-scout";

function linesToText(lines: string[]) {
  return lines.join("\n");
}

/** Keep raw line breaks while typing — trim only on save. */
function textToDraftLines(value: string) {
  return value.split(/\r?\n/);
}

function formatDisplayDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed);
  if (!iso) return trimmed;
  const [y, m, d] = trimmed.split("-");
  return `${Number(d)}/${Number(m)}/${y}`;
}

function friendlyImageError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message || "Could not read the image.";
}

export function OpponentScoutScreen() {
  const router = useRouter();
  const navModules = useLibraryNavModules();
  const pdfBrand = useSettingsStore((s) => s.pdfBrand);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const applySettings = useSettingsStore((s) => s.applyAll);
  const [reports, setReports] = useState<OpponentScoutReport[]>([]);
  const [draft, setDraft] = useState<OpponentScoutReport>(() =>
    createEmptyOpponentScoutReport(),
  );
  const [dirty, setDirty] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const teamLogoInputRef = useRef<HTMLInputElement>(null);
  const playerPhotoInputRef = useRef<HTMLInputElement>(null);
  const saveRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!settingsHydrated) hydrateSettings();
  }, [settingsHydrated, hydrateSettings]);

  useEffect(() => {
    applySettings();
  }, [applySettings]);

  useEffect(() => {
    if (!isLibraryNavModuleEnabled(navModules, "opponent-scout")) {
      router.replace("/library");
    }
  }, [navModules, router]);

  useEffect(() => {
    const loaded = loadOpponentScoutReports();
    setReports(loaded);
    if (loaded[0]) {
      setDraft(structuredClone(loaded[0]));
      setSelectedPlayerId(loaded[0].players[0]?.id ?? null);
      setDirty(false);
    }
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      saveRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectedPlayer = useMemo(
    () => draft.players.find((player) => player.id === selectedPlayerId) ?? null,
    [draft.players, selectedPlayerId],
  );

  function refreshList(activeId?: string) {
    const loaded = loadOpponentScoutReports();
    setReports(loaded);
    if (activeId) {
      const found = loaded.find((row) => row.id === activeId);
      if (found) {
        setDraft(structuredClone(found));
        setSelectedPlayerId(found.players[0]?.id ?? null);
        setDirty(false);
      }
    }
  }

  function updateDraft(updater: (prev: OpponentScoutReport) => OpponentScoutReport) {
    setDraft((prev) => updater(prev));
    setDirty(true);
  }

  function updatePlayer(
    playerId: string,
    updater: (player: OpponentScoutPlayer) => OpponentScoutPlayer,
  ) {
    updateDraft((prev) => ({
      ...prev,
      players: prev.players.map((player) =>
        player.id === playerId ? updater(player) : player,
      ),
    }));
  }

  function startBlankReport() {
    const next = createEmptyOpponentScoutReport();
    setDraft(next);
    setSelectedPlayerId(next.players[0]?.id ?? null);
    setDirty(true);
  }

  function handleNewReport() {
    if (dirty) {
      void (async () => {
        const ok = await appConfirm({
          title: "Discard changes?",
          message: "You have unsaved changes. Start a new report without saving?",
          confirmLabel: "Discard",
          danger: true,
        });
        if (!ok) return;
        startBlankReport();
      })();
      return;
    }
    startBlankReport();
  }

  function handleSelectReport(report: OpponentScoutReport) {
    if (dirty) {
      void (async () => {
        const ok = await appConfirm({
          title: "Discard changes?",
          message: "You have unsaved changes. Switch report without saving?",
          confirmLabel: "Discard",
          danger: true,
        });
        if (!ok) return;
        setDraft(structuredClone(report));
        setSelectedPlayerId(report.players[0]?.id ?? null);
        setDirty(false);
      })();
      return;
    }
    setDraft(structuredClone(report));
    setSelectedPlayerId(report.players[0]?.id ?? null);
    setDirty(false);
  }

  function handleSave() {
    if (!draft.teamName.trim()) {
      appNotice("Team name required", "Enter the opponent team name before saving.");
      return;
    }
    try {
      const saved = saveOpponentScoutReport(draft);
      setDraft(structuredClone(saved));
      setDirty(false);
      refreshList(saved.id);
      appNotice("Saved", "Opponent scout report saved.");
    } catch (error) {
      appNotice("Save failed", friendlyImageError(error));
    }
  }
  saveRef.current = handleSave;

  function handleDuplicate() {
    try {
      if (dirty) {
        if (!draft.teamName.trim()) {
          appNotice(
            "Team name required",
            "Enter the opponent team name before duplicating.",
          );
          return;
        }
        saveOpponentScoutReport(draft);
      }
      const copy = duplicateOpponentScoutReport(draft);
      setDraft(structuredClone(copy));
      setSelectedPlayerId(copy.players[0]?.id ?? null);
      setDirty(false);
      refreshList(copy.id);
      appNotice("Duplicated", "Created a copy of this scout report.");
    } catch (error) {
      appNotice("Duplicate failed", friendlyImageError(error));
    }
  }

  async function handleDelete() {
    const exists = reports.some((row) => row.id === draft.id);
    if (!exists) {
      startBlankReport();
      return;
    }
    const ok = await appConfirm({
      title: "Delete scout report",
      message: `Delete “${opponentScoutReportLabel(draft)}”?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    deleteOpponentScoutReport(draft.id);
    const loaded = loadOpponentScoutReports();
    setReports(loaded);
    if (loaded[0]) {
      setDraft(structuredClone(loaded[0]));
      setSelectedPlayerId(loaded[0].players[0]?.id ?? null);
    } else {
      startBlankReport();
    }
    setDirty(false);
  }

  function handleAddPlayer() {
    const player = createEmptyOpponentScoutPlayer();
    updateDraft((prev) => ({
      ...prev,
      players: [...prev.players, player],
    }));
    setSelectedPlayerId(player.id);
  }

  async function handleRemovePlayer(playerId: string) {
    if (draft.players.length <= 1) {
      appNotice("Keep one player", "A scout report needs at least one player.");
      return;
    }
    const ok = await appConfirm({
      title: "Remove player",
      message: "Remove this player from the scout report?",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    updateDraft((prev) => {
      const players = prev.players.filter((player) => player.id !== playerId);
      return { ...prev, players };
    });
    setSelectedPlayerId((current) => {
      if (current !== playerId) return current;
      const remaining = draft.players.filter((player) => player.id !== playerId);
      return remaining[0]?.id ?? null;
    });
  }

  async function handleTeamLogoChange(file: File | null) {
    if (!file) return;
    try {
      const dataUrl = await readCompressedImageDataUrl(file, { maxSide: 256 });
      updateDraft((prev) => ({ ...prev, teamLogoDataUrl: dataUrl }));
    } catch (error) {
      appNotice("Image error", friendlyImageError(error));
    }
  }

  async function handlePlayerPhotoChange(file: File | null) {
    if (!file || !selectedPlayer) return;
    try {
      const dataUrl = await readCompressedImageDataUrl(file, { maxSide: 512 });
      updatePlayer(selectedPlayer.id, (player) => ({
        ...player,
        photoDataUrl: dataUrl,
      }));
    } catch (error) {
      appNotice("Image error", friendlyImageError(error));
    }
  }

  function handlePrintExport() {
    if (!draft.teamName.trim()) {
      appNotice(
        "Team name required",
        "Enter the opponent team name before printing.",
      );
      return;
    }
    if (dirty) {
      try {
        const saved = saveOpponentScoutReport(draft);
        setDraft(structuredClone(saved));
        setDirty(false);
        refreshList(saved.id);
      } catch (error) {
        appNotice("Save failed", friendlyImageError(error));
        return;
      }
    }
    setPrintOpen(true);
  }

  const printLogo =
    draft.teamLogoDataUrl || pdfBrand.logoDataUrl || "";

  return (
    <div
      className="fd-ui screen-root active library-opponent-scout-mode"
      id="screen-organizer"
    >
      <FdAppHeader activeTab="opponent-scout" />
      <div className="org-body">
        <div id="screen-opponent-scout" className="fc-opponent-scout-screen">
      <aside className="fc-os-sidebar">
        <div className="fc-os-sidebar-head">
          <h2>Opponent Scout</h2>
          <button type="button" className="fc-os-btn primary" onClick={handleNewReport}>
            New
          </button>
        </div>
        <ul className="fc-os-report-list">
          {reports.length === 0 ? (
            <li className="fc-os-empty">No saved reports yet.</li>
          ) : (
            reports.map((report) => (
              <li key={report.id}>
                <button
                  type="button"
                  className={
                    report.id === draft.id
                      ? "fc-os-report-item active"
                      : "fc-os-report-item"
                  }
                  onClick={() => handleSelectReport(report)}
                >
                  <span className="fc-os-report-title">
                    {report.teamName || "Untitled opponent"}
                  </span>
                  <span className="fc-os-report-meta">
                    {formatDisplayDate(report.gameDate) || "No date"} ·{" "}
                    {report.players.length} players
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <section className="fc-os-editor">
        <div className="fc-os-toolbar">
          <div className="fc-os-toolbar-title">
            <span>OPPONENT SCOUT</span>
            {dirty ? <em className="fc-os-dirty">Unsaved</em> : null}
          </div>
          <div className="fc-os-toolbar-actions">
            <button type="button" className="fc-os-btn" onClick={handleDuplicate}>
              Duplicate
            </button>
            <button type="button" className="fc-os-btn" onClick={handleDelete}>
              Delete
            </button>
            <button
              type="button"
              className="fc-os-btn primary"
              title="Save (Ctrl+S)"
              onClick={handleSave}
            >
              Save
            </button>
            <button type="button" className="fc-os-btn accent" onClick={handlePrintExport}>
              Print / Export
            </button>
          </div>
        </div>

        <div className="fc-os-editor-scroll">
          <div className="fc-os-header-card">
            <div className="fc-os-logo-field">
              <div className="fc-os-logo-preview">
                {draft.teamLogoDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.teamLogoDataUrl} alt="Team logo" />
                ) : (
                  <span>Logo</span>
                )}
              </div>
              <input
                ref={teamLogoInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void handleTeamLogoChange(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="fc-os-btn"
                onClick={() => teamLogoInputRef.current?.click()}
              >
                Upload logo
              </button>
              {draft.teamLogoDataUrl ? (
                <button
                  type="button"
                  className="fc-os-btn"
                  onClick={() =>
                    updateDraft((prev) => ({ ...prev, teamLogoDataUrl: "" }))
                  }
                >
                  Clear
                </button>
              ) : null}
            </div>

            <div className="fc-os-header-fields">
              <label>
                <span>Opponent team</span>
                <input
                  value={draft.teamName}
                  onChange={(e) =>
                    updateDraft((prev) => ({
                      ...prev,
                      teamName: e.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>Game date</span>
                <input
                  type="date"
                  value={draft.gameDate}
                  onChange={(e) =>
                    updateDraft((prev) => ({
                      ...prev,
                      gameDate: e.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </div>

          <div className="fc-os-players-panel">
            <div className="fc-os-players-toolbar">
              <h3>Players</h3>
              <button type="button" className="fc-os-btn primary" onClick={handleAddPlayer}>
                Add player
              </button>
            </div>

            <div className="fc-os-players-layout">
              <ul className="fc-os-player-list">
                {draft.players.map((player, index) => (
                  <li key={player.id}>
                    <button
                      type="button"
                      className={
                        player.id === selectedPlayerId
                          ? "fc-os-player-item active"
                          : "fc-os-player-item"
                      }
                      onClick={() => setSelectedPlayerId(player.id)}
                    >
                      <strong>
                        #{player.jersey || "—"} {player.name || `Player ${index + 1}`}
                      </strong>
                      <span>
                        {[player.position, player.height].filter(Boolean).join(" · ") ||
                          "No details"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              {selectedPlayer ? (
                <div className="fc-os-player-editor">
                  <div className="fc-os-player-top">
                    <div className="fc-os-photo-field">
                      <div className="fc-os-photo-preview">
                        {selectedPlayer.photoDataUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={selectedPlayer.photoDataUrl} alt={selectedPlayer.name} />
                        ) : (
                          <span>Photo</span>
                        )}
                      </div>
                      <input
                        ref={playerPhotoInputRef}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          void handlePlayerPhotoChange(e.target.files?.[0] ?? null);
                          e.target.value = "";
                        }}
                      />
                      <div className="fc-os-photo-actions">
                        <button
                          type="button"
                          className="fc-os-btn"
                          onClick={() => playerPhotoInputRef.current?.click()}
                        >
                          Upload photo
                        </button>
                        {selectedPlayer.photoDataUrl ? (
                          <button
                            type="button"
                            className="fc-os-btn"
                            onClick={() =>
                              updatePlayer(selectedPlayer.id, (player) => ({
                                ...player,
                                photoDataUrl: "",
                              }))
                            }
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="fc-os-player-fields">
                      <label>
                        <span>#</span>
                        <input
                          value={selectedPlayer.jersey}
                          onChange={(e) =>
                            updatePlayer(selectedPlayer.id, (player) => ({
                              ...player,
                              jersey: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="fc-os-span-2">
                        <span>Name</span>
                        <input
                          value={selectedPlayer.name}
                          onChange={(e) =>
                            updatePlayer(selectedPlayer.id, (player) => ({
                              ...player,
                              name: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Position</span>
                        <input
                          value={selectedPlayer.position}
                          onChange={(e) =>
                            updatePlayer(selectedPlayer.id, (player) => ({
                              ...player,
                              position: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <label>
                        <span>Height</span>
                        <input
                          value={selectedPlayer.height}
                          onChange={(e) =>
                            updatePlayer(selectedPlayer.id, (player) => ({
                              ...player,
                              height: e.target.value,
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="fc-os-stats-grid">
                    {OPPONENT_SCOUT_STAT_COLUMNS.map((column) => (
                      <label key={column.key}>
                        <span>{column.label}</span>
                        <input
                          value={selectedPlayer.stats[column.key]}
                          onChange={(e) =>
                            updatePlayer(selectedPlayer.id, (player) => ({
                              ...player,
                              stats: {
                                ...player.stats,
                                [column.key]: e.target.value,
                              } satisfies OpponentScoutStats,
                            }))
                          }
                        />
                      </label>
                    ))}
                  </div>

                  <div className="fc-os-sw-grid">
                    <label>
                      <span>Strengths (one per line)</span>
                      <textarea
                        rows={5}
                        value={linesToText(selectedPlayer.strengths)}
                        onChange={(e) =>
                          updatePlayer(selectedPlayer.id, (player) => ({
                            ...player,
                            strengths: textToDraftLines(e.target.value),
                          }))
                        }
                      />
                    </label>
                    <label>
                      <span>Weaknesses (one per line)</span>
                      <textarea
                        rows={5}
                        value={linesToText(selectedPlayer.weaknesses)}
                        onChange={(e) =>
                          updatePlayer(selectedPlayer.id, (player) => ({
                            ...player,
                            weaknesses: textToDraftLines(e.target.value),
                          }))
                        }
                      />
                    </label>
                  </div>

                  <div className="fc-os-player-footer">
                    <button
                      type="button"
                      className="fc-os-btn danger"
                      onClick={() => void handleRemovePlayer(selectedPlayer.id)}
                    >
                      Remove player
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {printOpen ? (
        <OpponentScoutPrintOverlay
          report={draft}
          brandLogoDataUrl={printLogo}
          footerLogoDataUrl={pdfBrand.logoDataUrl || printLogo}
          onClose={() => setPrintOpen(false)}
        />
      ) : null}
        </div>
      </div>
      <FdAppFooter />
    </div>
  );
}
