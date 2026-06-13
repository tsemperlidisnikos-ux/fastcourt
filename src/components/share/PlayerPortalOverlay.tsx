"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import { PresentationOverlay } from "@/components/library/PresentationOverlay";
import {
  defaultRosterTeam,
  getRosterTeamOptions,
} from "@/lib/players/team-options";
import {
  shareContentToPlayers,
  sharePlaysAsPlaybookToPlayers,
} from "@/lib/players/share-to-players";
import { copyShareResult } from "@/lib/share/share-link";
import { appNotice } from "@/stores/dialog-store";
import { useOrganizerStore } from "@/stores/organizer-store";
import { useShareStore } from "@/stores/share-store";
import type { PlaybookSection } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";
import "@/styles/player-portal.css";

export function PlayerPortalOverlay() {
  const portalOpen = useShareStore((s) => s.portalOpen);
  const playerShareSession = useShareStore((s) => s.playerShareSession);
  const closePortal = useShareStore((s) => s.closePortal);
  const clearPlayerShareSession = useShareStore((s) => s.clearPlayerShareSession);
  const openRosterModal = useShareStore((s) => s.openRosterModal);

  const playbooks = useOrganizerStore((s) => s.playbooks);
  const plays = useOrganizerStore((s) => s.plays);
  const teams = useOrganizerStore((s) => s.teams);
  const resolvePlaybookPlays = useOrganizerStore((s) => s.resolvePlaybookPlays);

  const shareMode = !!playerShareSession;
  const sourcePlaybooks = shareMode
    ? [
        {
          id: "share_playbook",
          name: playerShareSession.section.name,
          team: playerShareSession.section.team || "",
          subtitle: playerShareSession.section.subtitle,
          playRefs: playerShareSession.plays.map((p) => p.id),
          updatedAt: new Date().toISOString(),
        },
      ]
    : playbooks;
  const sourcePlays = shareMode ? playerShareSession.plays : plays;

  const [teamFilter, setTeamFilter] = useState("");
  const [selectedPlaybookId, setSelectedPlaybookId] = useState<string | null>(null);
  const [selectedPlayId, setSelectedPlayId] = useState<string | null>(null);
  const [checkedPlayIds, setCheckedPlayIds] = useState<Set<string>>(new Set());
  const [presentPlay, setPresentPlay] = useState<StoredPlay | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const teamList = useMemo(() => getRosterTeamOptions(teams), [teams]);

  useEffect(() => {
    if (!portalOpen) return;
    const initial = defaultRosterTeam(teams, teamFilter);
    if (!teamFilter || !teamList.includes(teamFilter)) setTeamFilter(initial);
  }, [portalOpen, teamFilter, teamList, teams]);

  useEffect(() => {
    if (!portalOpen) return;
    document.body.classList.add("player-portal-open");
    return () => document.body.classList.remove("player-portal-open");
  }, [portalOpen]);

  const filteredPlaybooks = useMemo(() => {
    const norm = teamFilter.trim();
    return sourcePlaybooks.filter((section) => {
      const sectionPlays = shareMode
        ? sourcePlays
        : resolvePlaybookPlays(section);
      if (!sectionPlays.length) return false;
      if (!norm || norm === "No Team") return true;
      return (section.team || "No Team") === norm;
    });
  }, [teamFilter, sourcePlaybooks, sourcePlays, shareMode, resolvePlaybookPlays]);

  const filteredPlays = useMemo(() => {
    const norm = teamFilter.trim();
    return sourcePlays.filter((play) => {
      if (!norm || norm === "No Team") return true;
      return (play.team || "No Team") === norm;
    });
  }, [teamFilter, sourcePlays]);

  const checkedPlays = useMemo(
    () => filteredPlays.filter((play) => checkedPlayIds.has(play.id)),
    [filteredPlays, checkedPlayIds],
  );

  useEffect(() => {
    const valid = new Set(filteredPlays.map((play) => play.id));
    setCheckedPlayIds((prev) => {
      const next = new Set([...prev].filter((id) => valid.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filteredPlays]);

  const selectedPlaybook =
    sourcePlaybooks.find((p) => p.id === selectedPlaybookId) ?? null;
  const playbookPlays = selectedPlaybook
    ? shareMode
      ? sourcePlays
      : resolvePlaybookPlays(selectedPlaybook)
    : [];
  const selectedPlay =
    sourcePlays.find((p) => p.id === selectedPlayId) ??
    playbookPlays.find((p) => p.id === selectedPlayId) ??
    null;

  function handleClose() {
    setPresentPlay(null);
    closePortal();
    clearPlayerShareSession();
  }

  function sendSelectedPlaybookToPlayers() {
    if (!selectedPlaybook) {
      appNotice("Select playbook", "Select a playbook first.");
      return;
    }
    const pbPlays = shareMode ? sourcePlays : resolvePlaybookPlays(selectedPlaybook);
    if (!pbPlays.length) {
      appNotice("Empty playbook", "This playbook has no plays to share.");
      return;
    }
    shareContentToPlayers({
      kind: "playbook",
      section: {
        name: selectedPlaybook.name,
        team: selectedPlaybook.team,
        subtitle: selectedPlaybook.subtitle,
      },
      plays: pbPlays,
    });
  }

  async function copySelectedPlaybookLink() {
    if (!selectedPlaybook) {
      appNotice("Select playbook", "Select a playbook first.");
      return;
    }
    const pbPlays = shareMode ? sourcePlays : resolvePlaybookPlays(selectedPlaybook);
    if (!pbPlays.length) {
      appNotice("Empty playbook", "This playbook has no plays to share.");
      return;
    }
    const { buildSmartPlaybookUrl } = await import("@/lib/share/share-link");
    const result = buildSmartPlaybookUrl(
      {
        name: selectedPlaybook.name,
        team: selectedPlaybook.team,
        subtitle: selectedPlaybook.subtitle,
      },
      pbPlays,
      { playerView: true },
    );
    await copyShareResult(result, "Player playbook link");
  }

  function togglePlayCheck(playId: string, checked: boolean) {
    setCheckedPlayIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(playId);
      else next.delete(playId);
      return next;
    });
  }

  function selectAllPlays() {
    setCheckedPlayIds(new Set(filteredPlays.map((play) => play.id)));
  }

  function clearPlayChecks() {
    setCheckedPlayIds(new Set());
  }

  function sendPlaysToPlayers(playsToSend: StoredPlay[]) {
    sharePlaysAsPlaybookToPlayers(playsToSend, {
      team: teamFilter,
      name:
        playsToSend.length === 1
          ? playsToSend[0].title || "Playbook"
          : `${teamFilter} — Selected plays`,
      subtitle: `${playsToSend.length} ${playsToSend.length === 1 ? "play" : "plays"}`,
    });
  }

  function shareWithPlayers() {
    if (checkedPlays.length) {
      sendPlaysToPlayers(checkedPlays);
      return;
    }
    if (selectedPlaybook) {
      sendSelectedPlaybookToPlayers();
      return;
    }
    appNotice(
      "Nothing selected",
      "Tick one or more plays, or select a playbook to share.",
    );
  }

  function sendFromPreview() {
    if (checkedPlays.length) {
      sendPlaysToPlayers(checkedPlays);
      return;
    }
    if (!selectedPlay) return;
    sendPlaysToPlayers([selectedPlay]);
  }

  if (!portalOpen || !mounted) return null;

  return createPortal(
    <>
      <div className="player-portal-overlay" id="player-portal-overlay">
        <div className="player-portal-shell">
          <header className="player-portal-header">
            <div className="player-portal-header-left">
              <h2 className="player-portal-title">
                {shareMode
                  ? playerShareSession.section.name || "Team playbook"
                  : "Team playbook"}
              </h2>
              <p className="player-portal-sub">
                {shareMode
                  ? "Player view — shared link preview."
                  : "Preview for coaches — share a link so players can view without login."}
              </p>
            </div>
            <div className="player-portal-header-actions">
              {!shareMode ? (
                <label className="player-portal-team-field">
                  <span>Team</span>
                  <select
                    id="player-portal-team"
                    value={teamFilter}
                    onChange={(e) => {
                      setTeamFilter(e.target.value);
                      setSelectedPlaybookId(null);
                      setSelectedPlayId(null);
                      setCheckedPlayIds(new Set());
                    }}
                  >
                    {teamList.map((team) => (
                      <option key={team} value={team}>
                        {team}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {!shareMode ? (
                <>
                  <button
                    type="button"
                    className="player-portal-btn player-portal-btn-ghost"
                    id="btn-player-portal-roster"
                    onClick={() => openRosterModal(teamFilter)}
                  >
                    👥 Roster
                  </button>
                  <button
                    type="button"
                    className="player-portal-btn player-portal-btn-primary"
                    id="btn-player-portal-share-playbook"
                    onClick={shareWithPlayers}
                  >
                    {checkedPlays.length
                      ? `Share selected (${checkedPlays.length})`
                      : "Share with players"}
                  </button>
                  <button
                    type="button"
                    className="player-portal-btn player-portal-btn-ghost"
                    id="btn-player-portal-copy-link"
                    onClick={() => void copySelectedPlaybookLink()}
                  >
                    Copy link
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="player-portal-btn player-portal-btn-close"
                id="btn-player-portal-close"
                onClick={handleClose}
              >
                ✕ Close
              </button>
            </div>
          </header>

          <div className="player-portal-body">
            <aside className="player-portal-sidebar">
              <div className="player-portal-section-title">Playbooks</div>
              <div className="player-portal-list" id="player-portal-playbooks">
                {filteredPlaybooks.length === 0 ? (
                  <p className="player-portal-empty-list">No playbooks for this team.</p>
                ) : (
                  filteredPlaybooks.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      className={`player-portal-item${selectedPlaybookId === section.id ? " is-selected" : ""}`}
                      onClick={() => {
                        setSelectedPlaybookId(section.id);
                        setSelectedPlayId(null);
                      }}
                    >
                      <span className="player-portal-item-name">{section.name}</span>
                      <span className="player-portal-item-meta">
                        {(shareMode
                          ? sourcePlays.length
                          : resolvePlaybookPlays(section).length)}{" "}
                        plays
                      </span>
                    </button>
                  ))
                )}
              </div>

              <div className="player-portal-plays-head">
                <div className="player-portal-section-title">Plays</div>
                {filteredPlays.length > 0 && !shareMode ? (
                  <div className="player-portal-plays-toolbar">
                    <span className="player-portal-plays-count">
                      {checkedPlays.length} selected
                    </span>
                    <button
                      type="button"
                      className="player-portal-plays-tool-btn"
                      onClick={selectAllPlays}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className="player-portal-plays-tool-btn"
                      onClick={clearPlayChecks}
                    >
                      Clear
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="player-portal-list" id="player-portal-plays">
                {filteredPlays.length === 0 ? (
                  <p className="player-portal-empty-list">No plays for this team.</p>
                ) : (
                  filteredPlays.map((play) => (
                    <div
                      key={play.id}
                      className={`player-portal-play-row${selectedPlayId === play.id ? " is-previewing" : ""}${checkedPlayIds.has(play.id) ? " is-checked" : ""}`}
                    >
                      {!shareMode ? (
                        <input
                          type="checkbox"
                          className="player-portal-play-check"
                          checked={checkedPlayIds.has(play.id)}
                          aria-label={`Select ${play.title}`}
                          onChange={(e) => togglePlayCheck(play.id, e.target.checked)}
                        />
                      ) : null}
                      <button
                        type="button"
                        className={`player-portal-item${selectedPlayId === play.id ? " is-selected" : ""}`}
                        onClick={() => {
                          setSelectedPlayId(play.id);
                          setSelectedPlaybookId(null);
                        }}
                      >
                        <span className="player-portal-item-name">{play.title}</span>
                        <span className="player-portal-item-meta">
                          {play.frames.length} frames · {play.team || "No Team"}
                        </span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </aside>

            <main className="player-portal-main" id="player-portal-main">
              {!selectedPlay ? (
                <div className="player-portal-empty" id="player-portal-empty">
                  Select a playbook or play to preview.
                </div>
              ) : (
                <div className="player-portal-preview" id="player-portal-preview">
                  <div className="player-portal-preview-head">
                    <h3 id="player-portal-preview-name">{selectedPlay.title}</h3>
                    <p id="player-portal-preview-meta">
                      {selectedPlay.team || "No Team"} · {selectedPlay.frames.length}{" "}
                      frame{selectedPlay.frames.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="player-portal-preview-court">
                    <CourtFrameThumbnail
                      frame={selectedPlay.frames[0]}
                      courtType={selectedPlay.courtType}
                      size="sm"
                    />
                  </div>
                  <div className="player-portal-preview-actions player-portal-preview-actions-sticky">
                    {!shareMode ? (
                      <button
                        type="button"
                        className="player-portal-btn player-portal-btn-primary"
                        id="btn-player-portal-send-play"
                        onClick={sendFromPreview}
                      >
                        {checkedPlays.length
                          ? `Send selected (${checkedPlays.length})`
                          : "Send to players"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="player-portal-btn player-portal-present-btn"
                      id="btn-player-portal-present"
                      onClick={() => setPresentPlay(selectedPlay)}
                    >
                      ▶ Present
                    </button>
                    {selectedPlay.videoUrl ? (
                      <a
                        className="player-portal-btn player-portal-video-btn"
                        id="btn-player-portal-video"
                        href={selectedPlay.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        ▶ Watch video
                      </a>
                    ) : null}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {presentPlay ? (
        <PresentationOverlay play={presentPlay} onClose={() => setPresentPlay(null)} />
      ) : null}
    </>,
    document.body,
  );
}
