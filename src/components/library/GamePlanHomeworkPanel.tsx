"use client";

import { useMemo } from "react";
import { getTeamRoster, playerRosterDisplayName } from "@/lib/players/player-roster";
import { shareHomeworkToPlayers } from "@/lib/players/share-to-players";
import {
  formatHomeworkDueDate,
  homeworkOpenedCount,
  homeworkStudiedCount,
} from "@/lib/game-plan/player-homework";
import { useOrganizerStore } from "@/stores/organizer-store";
import { appNotice, appPrompt } from "@/stores/dialog-store";
import type { GamePlan, PlayerHomeworkAssignment } from "@/types/library-meta";

interface Props {
  plan: GamePlan;
  assignment: PlayerHomeworkAssignment;
}

export function GamePlanHomeworkPanel({ plan, assignment }: Props) {
  const plays = useOrganizerStore((s) => s.plays);
  const setPlayerHomeworkStudied = useOrganizerStore((s) => s.setPlayerHomeworkStudied);
  const updatePlayerHomework = useOrganizerStore((s) => s.updatePlayerHomework);
  const deletePlayerHomework = useOrganizerStore((s) => s.deletePlayerHomework);

  const roster = useMemo(
    () => getTeamRoster(assignment.team).players,
    [assignment.team, assignment.updatedAt],
  );
  const studiedCount = homeworkStudiedCount(assignment);

  async function handleEditDueDate() {
    const dueDate = await appPrompt({
      title: "Homework due date",
      label: "Due (YYYY-MM-DD)",
      initialValue: assignment.dueDate,
      submitLabel: "Save",
    });
    if (!dueDate?.trim()) return;
    await updatePlayerHomework(assignment.id, { dueDate: dueDate.trim() });
  }

  async function handleCloseHomework() {
    await updatePlayerHomework(assignment.id, { status: "closed" });
    appNotice("Homework", "Assignment marked closed.");
  }

  async function handleDeleteHomework() {
    await deletePlayerHomework(assignment.id);
  }

  function handleShare() {
    const ok = shareHomeworkToPlayers(assignment, plan, plays);
    if (!ok) return;
    appNotice("Homework", "Choose players to send the study link.");
  }

  return (
    <section className="fc-game-plan-homework-panel" aria-label="Player homework">
      <div className="fc-game-plan-homework-head">
        <div>
          <h3 className="fc-game-plan-homework-title">{assignment.title}</h3>
          <p className="fc-game-plan-homework-meta">
            Due {formatHomeworkDueDate(assignment.dueDate)} · {assignment.playIds.length} plays
            {(assignment.readItems?.length ?? 0) > 0
              ? ` · ${assignment.readItems!.length} film read${assignment.readItems!.length === 1 ? "" : "s"}`
              : ""}{" "}
            · {studiedCount}/{roster.length || 0} studied · {homeworkOpenedCount(assignment)} opened
          </p>
        </div>
        <div className="fc-game-plan-homework-actions">
          <button type="button" className="fc-game-plan-homework-btn" onClick={handleEditDueDate}>
            Due date
          </button>
          <button type="button" className="fc-game-plan-homework-btn primary" onClick={handleShare}>
            Send to players
          </button>
          {assignment.status === "open" ? (
            <button
              type="button"
              className="fc-game-plan-homework-btn"
              onClick={() => void handleCloseHomework()}
            >
              Close
            </button>
          ) : null}
          <button
            type="button"
            className="fc-game-plan-homework-btn danger"
            onClick={() => void handleDeleteHomework()}
          >
            Delete
          </button>
        </div>
      </div>

      {assignment.notes?.trim() ? (
        <p className="fc-game-plan-homework-notes">{assignment.notes.trim()}</p>
      ) : null}

      {!roster.length ? (
        <p className="fc-game-plan-homework-empty">
          Add players in the <strong>Players</strong> tab for team {assignment.team}, then mark who
          studied.
        </p>
      ) : (
        <ul className="fc-game-plan-homework-roster">
          {roster.map((player) => {
            const status = assignment.playerStatus[player.id];
            const studied = !!status?.studied;
            return (
              <li key={player.id} className="fc-game-plan-homework-player-row">
                <label className="fc-game-plan-homework-player-label">
                  <input
                    type="checkbox"
                    checked={studied}
                    onChange={(event) =>
                      void setPlayerHomeworkStudied(
                        assignment.id,
                        player.id,
                        event.target.checked,
                      )
                    }
                  />
                  <span className="fc-game-plan-homework-player-name">
                    {playerRosterDisplayName(player)}
                  </span>
                </label>
                <div className="fc-game-plan-homework-player-badges">
                  {status?.openedAt ? (
                    <span className="fc-game-plan-homework-player-badge opened">
                      Opened
                    </span>
                  ) : null}
                  {studied ? (
                    <span className="fc-game-plan-homework-player-badge studied">
                      {status?.source === "player" ? "Studied (player)" : "Studied"}
                    </span>
                  ) : null}
                  {studied && status?.studiedAt ? (
                    <span className="fc-game-plan-homework-player-date">
                      {new Date(status.studiedAt).toLocaleDateString()}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
