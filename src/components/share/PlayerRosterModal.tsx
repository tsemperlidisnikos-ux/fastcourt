"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  addRosterPlayer,
  getTeamRoster,
  playerRosterContactMeta,
  playerRosterDisplayName,
  removeRosterPlayer,
} from "@/lib/players/player-roster";
import {
  defaultRosterTeam,
  getRosterTeamOptions,
  isRealTeam,
} from "@/lib/players/team-options";
import { useOrganizerStore } from "@/stores/organizer-store";
import { useShareStore } from "@/stores/share-store";
import { appNotice } from "@/stores/dialog-store";
import type { PlayerRosterEntry } from "@/types/player-roster";
import "@/styles/player-share.css";

function playerInitials(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function PlayerRosterModal() {
  const open = useShareStore((s) => s.rosterModalOpen);
  const initialTeam = useShareStore((s) => s.rosterModalTeam);
  const closeRosterModal = useShareStore((s) => s.closeRosterModal);

  const configuredTeams = useOrganizerStore((s) => s.teams);

  const [mounted, setMounted] = useState(false);
  const [team, setTeam] = useState(initialTeam);
  const [players, setPlayers] = useState<PlayerRosterEntry[]>([]);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState("");

  const teamList = useMemo(
    () => getRosterTeamOptions(configuredTeams),
    [configuredTeams],
  );

  const needsTeamSetup = teamList.length === 1 && teamList[0] === "No Team";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setTeam(defaultRosterTeam(configuredTeams, initialTeam));
  }, [open, initialTeam, configuredTeams]);

  useEffect(() => {
    if (!open) return;
    setPlayers(getTeamRoster(team).players);
  }, [open, team]);

  function refreshRoster() {
    setPlayers(getTeamRoster(team).players);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (needsTeamSetup) {
      setFormError(
        "Create teams first in Library → Fields → Teams, then add players to each team.",
      );
      return;
    }
    const created = addRosterPlayer(
      team,
      { name, number, email, phone },
      configuredTeams,
    );
    if (!created) {
      setFormError("Select a team and enter a player name.");
      return;
    }
    setFormError("");
    setName("");
    setNumber("");
    setEmail("");
    setPhone("");
    refreshRoster();
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      id="player-roster-modal"
      className="active"
      role="presentation"
      onClick={closeRosterModal}
    >
      <div
        className="modal-box player-roster-modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-roster-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-box-inner">
          <div className="player-roster-hero">
            <div className="player-roster-hero-icon" aria-hidden="true">
              👥
            </div>
            <div>
              <h2 className="modal-title" id="player-roster-title">
                Team roster
              </h2>
              <p className="modal-subtitle" id="player-roster-subtitle">
                Each player belongs to one team. Switch team to manage a
                different roster.
              </p>
            </div>
          </div>

          <div className="player-roster-team-bar">
            <label className="player-roster-team-bar-field">
              <span>Team</span>
              <select
                id="player-roster-team"
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                disabled={needsTeamSetup}
              >
                {teamList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            {isRealTeam(team) ? (
              <span className="player-roster-team-active">
                Managing roster for <strong>{team}</strong>
              </span>
            ) : null}
          </div>

          {needsTeamSetup ? (
            <div className="player-roster-setup-hint">
              No teams configured yet. Go to{" "}
              <strong>Library → Fields → Teams</strong> and create your teams
              (e.g. U16, First Team), then come back to add players.
            </div>
          ) : (
            <div className="player-roster-add-card">
              <h3 className="player-roster-add-title">
                Add player to {team}
              </h3>
              <form className="player-roster-form" onSubmit={handleSubmit} noValidate>
                {formError ? (
                  <p className="player-roster-form-error" role="alert">
                    {formError}
                  </p>
                ) : null}
                <label className="player-roster-field player-roster-field-name">
                  <span>Name</span>
                  <input
                    id="player-roster-name"
                    type="text"
                    placeholder="e.g. Nikos Papadopoulos"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="player-roster-field player-roster-field-number">
                  <span>#</span>
                  <input
                    id="player-roster-number"
                    type="text"
                    placeholder="12"
                    inputMode="numeric"
                    maxLength={3}
                    autoComplete="off"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                  />
                </label>
                <label className="player-roster-field player-roster-field-email">
                  <span>Email</span>
                  <input
                    id="player-roster-email"
                    type="email"
                    placeholder="player@email.com"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="player-roster-field player-roster-field-phone">
                  <span>Phone / WhatsApp</span>
                  <input
                    id="player-roster-phone"
                    type="tel"
                    placeholder="+30 69…"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
                <button type="submit" className="modal-create player-roster-submit">
                  + Add to {team}
                </button>
              </form>
            </div>
          )}

          <div className="player-roster-players-head">
            <h3 className="player-roster-players-title">
              {team} — Players
            </h3>
            <span className="player-roster-players-count">{players.length}</span>
          </div>
          <div className="player-roster-list" id="player-roster-list">
            {!players.length ? (
              <p className="player-roster-empty">
                No players on <strong>{team}</strong> yet.
                <br />
                Add your first player above.
              </p>
            ) : (
              players.map((player) => (
                <div key={player.id} className="player-roster-item">
                  <div className="player-roster-avatar" aria-hidden="true">
                    {playerInitials(player.name)}
                  </div>
                  <div className="player-roster-item-main">
                    <div className="player-roster-item-name">
                      {playerRosterDisplayName(player)}
                    </div>
                    <div className="player-roster-item-meta">
                      <span className="player-roster-team-badge">{player.team}</span>
                      {playerRosterContactMeta(player)}
                    </div>
                  </div>
                  <div className="player-roster-item-actions">
                    <button
                      type="button"
                      className="modal-cancel player-roster-remove"
                      onClick={() => {
                        removeRosterPlayer(team, player.id);
                        refreshRoster();
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button
            type="button"
            className="modal-cancel"
            id="player-roster-close"
            onClick={closeRosterModal}
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
