"use client";

import { FormEvent, useMemo, useState, type MouseEvent } from "react";
import {
  PlayerContextMenu,
  type PlayerContextMenuState,
} from "@/components/library/PlayerContextMenu";
import {
  appConfirm,
  appNotice,
} from "@/stores/dialog-store";
import {
  addRosterPlayer,
  getAllRosterPlayers,
  playerRosterDisplayName,
  removeRosterPlayer,
  updateRosterPlayer,
} from "@/lib/players/player-roster";
import {
  defaultRosterTeam,
  getRosterTeamOptions,
  isRealTeam,
} from "@/lib/players/team-options";
import { useOrganizerStore } from "@/stores/organizer-store";
import type { PlayerRosterEntry } from "@/types/player-roster";

type FormMode = "closed" | "add" | "edit";

export function PlayersView() {
  const configuredTeams = useOrganizerStore((s) => s.teams);

  const [refreshKey, setRefreshKey] = useState(0);
  const [teamFilter, setTeamFilter] = useState("All teams");
  const [query, setQuery] = useState("");
  const [formMode, setFormMode] = useState<FormMode>("closed");
  const [editingPlayer, setEditingPlayer] = useState<PlayerRosterEntry | null>(null);
  const [contextMenu, setContextMenu] = useState<PlayerContextMenuState | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const [addTeam, setAddTeam] = useState("");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const teamList = useMemo(
    () => getRosterTeamOptions(configuredTeams),
    [configuredTeams],
  );
  const needsTeamSetup = teamList.length === 1 && teamList[0] === "No Team";

  const allPlayers = useMemo(() => {
    void refreshKey;
    return getAllRosterPlayers();
  }, [refreshKey]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allPlayers.filter((player) => {
      if (teamFilter !== "All teams" && player.team !== teamFilter) return false;
      if (!q) return true;
      const haystack = [
        player.name,
        player.number,
        player.team,
        player.email,
        player.phone,
      ]
        .map((v) => String(v || "").toLowerCase())
        .join(" ");
      return haystack.includes(q);
    });
  }, [allPlayers, teamFilter, query]);

  const contextPlayer = useMemo(
    () => rows.find((p) => p.id === contextMenu?.playerId) ?? null,
    [contextMenu?.playerId, rows],
  );

  function refreshList() {
    setRefreshKey((k) => k + 1);
  }

  function resetFormFields() {
    setName("");
    setNumber("");
    setEmail("");
    setPhone("");
    setEditingPlayer(null);
  }

  function closeForm() {
    setFormMode("closed");
    resetFormFields();
  }

  function openAddForm() {
    if (needsTeamSetup) {
      appNotice(
        "Teams required",
        "Create teams first in Library → Fields → Teams, then add players here.",
      );
      return;
    }
    resetFormFields();
    setFormError("");
    setAddTeam(defaultRosterTeam(configuredTeams, teamFilter === "All teams" ? "" : teamFilter));
    setFormMode("add");
  }

  function openEditForm(player: PlayerRosterEntry) {
    setFormError("");
    setEditingPlayer(player);
    setAddTeam(player.team);
    setName(player.name);
    setNumber(player.number || "");
    setEmail(player.email || "");
    setPhone(player.phone || "");
    setFormMode("edit");
    setSelectedPlayerId(player.id);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (needsTeamSetup) return;

    if (formMode === "edit" && editingPlayer) {
      const updated = updateRosterPlayer(
        editingPlayer.team,
        editingPlayer.id,
        { team: addTeam, name, number, email, phone },
        configuredTeams,
      );
      if (!updated) {
        setFormError("Select a team and enter a player name.");
        return;
      }
      closeForm();
      refreshList();
      return;
    }

    const created = addRosterPlayer(
      addTeam,
      { name, number, email, phone },
      configuredTeams,
    );
    if (!created) {
      setFormError("Select a team and enter a player name.");
      return;
    }
    closeForm();
    refreshList();
  }

  async function handleDeletePlayer(player: PlayerRosterEntry) {
    const confirmed = await appConfirm({
      title: "Delete player",
      message: `Delete ${playerRosterDisplayName(player)} from ${player.team}?`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    removeRosterPlayer(player.team, player.id);
    if (selectedPlayerId === player.id) setSelectedPlayerId(null);
    refreshList();
  }

  function handleRowContextMenu(player: PlayerRosterEntry, e: MouseEvent<HTMLTableRowElement>) {
    e.preventDefault();
    setSelectedPlayerId(player.id);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      playerId: player.id,
    });
  }

  return (
    <>
    <div className="fc-players-shell" id="fc-players-shell">
      <div className="fc-players-toolbar">
        <div className="fc-players-toolbar-left">
          <label className="fc-players-team-field">
            <span>Team</span>
            <select
              id="players-team-filter"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="All teams">All teams</option>
              {teamList.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </label>
          <span className="fc-players-count-badge">
            {rows.length} player{rows.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="fc-players-actions">
          <button
            type="button"
            className="fc-players-create-btn fd-create-play-btn"
            id="btn-players-add"
            onClick={openAddForm}
          >
            + ADD PLAYER
          </button>
        </div>
      </div>

      {needsTeamSetup ? (
        <div className="fc-players-setup-hint">
          No teams configured yet. Go to <strong>Fields → Teams</strong> and create
          your teams (e.g. U16, First Team), then add players here.
        </div>
      ) : null}

      {formMode !== "closed" && !needsTeamSetup ? (
        <div className="fc-players-add-card">
          <h3 className="fc-players-add-title">
            {formMode === "edit" ? "Edit player" : "Add player"}
          </h3>
          <form className="fc-players-form" onSubmit={handleSubmit} noValidate>
            {formError ? (
              <p className="fc-players-form-error" role="alert">
                {formError}
              </p>
            ) : null}
            <label className="fc-players-field fc-players-field-team">
              <span>Team</span>
              <select
                id="players-add-team"
                value={addTeam}
                onChange={(e) => setAddTeam(e.target.value)}
              >
                {teamList.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </label>
            <label className="fc-players-field fc-players-field-name">
              <span>Name</span>
              <input
                id="players-add-name"
                type="text"
                placeholder="e.g. Nikos Papadopoulos"
                required
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (formError) setFormError("");
                }}
              />
            </label>
            <label className="fc-players-field fc-players-field-number">
              <span>#</span>
              <input
                id="players-add-number"
                type="text"
                placeholder="12"
                inputMode="numeric"
                maxLength={3}
                autoComplete="off"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </label>
            <label className="fc-players-field fc-players-field-email">
              <span>Email</span>
              <input
                id="players-add-email"
                type="email"
                placeholder="player@email.com"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="fc-players-field fc-players-field-phone">
              <span>Phone / WhatsApp</span>
              <input
                id="players-add-phone"
                type="tel"
                placeholder="+30 69…"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <div className="fc-players-form-actions">
              <button type="submit" className="fc-players-submit">
                {formMode === "edit"
                  ? "Save changes"
                  : `+ Add to ${isRealTeam(addTeam) ? addTeam : "team"}`}
              </button>
              <button type="button" className="fc-players-cancel" onClick={closeForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="fc-players-main">
        <div className="fc-players-search-row">
          <span className="fd-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            className="fc-players-search-input"
            id="players-search-input"
            placeholder="Search players"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="org-table-view fd-table-view fc-players-table-wrap" id="players-list">
          <div className="org-table-scroll fd-table-scroll">
            {!rows.length ? (
              <p className="fc-players-empty">
                {allPlayers.length
                  ? "No players match your search."
                  : "No players yet. Click + Add player to register your first athlete."}
              </p>
            ) : (
              <table className="org-play-table fd-play-table fc-players-table">
                <thead>
                  <tr>
                    <th className="col-team">Team</th>
                    <th className="col-player-number">#</th>
                    <th className="col-player-name">Player Name</th>
                    <th className="col-player-email">Email</th>
                    <th className="col-player-phone">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((player) => (
                    <tr
                      key={player.id}
                      className={selectedPlayerId === player.id ? "selected" : ""}
                      onContextMenu={(e) => handleRowContextMenu(player, e)}
                      onClick={() => setSelectedPlayerId(player.id)}
                    >
                      <td className="col-team">{player.team || "—"}</td>
                      <td className="col-player-number">{player.number || "—"}</td>
                      <td className="col-player-name">
                        <span className="org-play-name-text">{player.name}</span>
                      </td>
                      <td className="col-player-email">{player.email || "—"}</td>
                      <td className="col-player-phone">{player.phone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {contextMenu && contextPlayer ? (
        <PlayerContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onEdit={() => openEditForm(contextPlayer)}
          onDelete={() => void handleDeletePlayer(contextPlayer)}
        />
      ) : null}
    </div>
    </>
  );
}
