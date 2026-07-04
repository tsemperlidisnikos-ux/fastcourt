"use client";

import { createPortal } from "react-dom";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useClientMounted } from "@/hooks/useClientMounted";
import {
  appendOpponentTendency,
  createFilmLinkedTendency,
  OPPONENT_TENDENCY_PRESETS,
  opponentTendencyKindLabel,
} from "@/lib/game-plan/opponent-board";
import { sortGamePlans } from "@/lib/game-plan/game-plan-items";
import {
  buildGamePlanDeepLink,
  formatFilmTimestamp,
} from "@/lib/film-room/film-game-plan-link";
import { useOrganizerStore } from "@/stores/organizer-store";
import { appNotice, appPrompt } from "@/stores/dialog-store";
import type { OpponentTendencyKind } from "@/types/library-meta";

interface Props {
  open: boolean;
  sessionId: string;
  sessionTitle: string;
  currentTime: number;
  onClose: () => void;
}

export function FilmRoomAddToGamePlanModal(props: Props) {
  const mounted = useClientMounted();
  if (!props.open || !mounted) return null;
  return <FilmRoomAddToGamePlanModalBody {...props} />;
}

function FilmRoomAddToGamePlanModalBody({
  sessionId,
  sessionTitle,
  currentTime,
  onClose,
}: Omit<Props, "open">) {
  const router = useRouter();
  const gamePlans = useOrganizerStore((s) => s.gamePlans);
  const updateGamePlan = useOrganizerStore((s) => s.updateGamePlan);

  const plans = useMemo(
    () =>
      sortGamePlans(gamePlans).filter((plan) => plan.status !== "archived"),
    [gamePlans],
  );

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    plans[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);

  const timeLabel = formatFilmTimestamp(currentTime);

  async function handlePickKind(kind: OpponentTendencyKind) {
    if (!selectedPlanId || busy) return;
    const plan = plans.find((row) => row.id === selectedPlanId);
    if (!plan) return;

    setBusy(true);
    try {
      let tendency = createFilmLinkedTendency(
        kind,
        sessionId,
        sessionTitle,
        currentTime,
      );

      if (kind === "other") {
        const custom = await appPrompt({
          title: "Opponent tendency",
          label: "What do they run?",
          initialValue: "",
          submitLabel: "Add",
        });
        if (!custom?.trim()) return;
        tendency = {
          ...tendency,
          kind: "other",
          label: custom.trim(),
        };
      } else {
        tendency = {
          ...tendency,
          label: opponentTendencyKindLabel(kind),
        };
      }

      const opponentBoard = appendOpponentTendency(plan.opponentBoard, tendency);
      await updateGamePlan(plan.id, { opponentBoard });
      appNotice(
        "Game plan",
        `Added "${tendency.label}" to ${plan.title}${timeLabel ? ` @ ${timeLabel}` : ""}.`,
      );
      onClose();
      router.push(buildGamePlanDeepLink(plan.id));
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="fc-film-game-plan-overlay" role="dialog" aria-modal="true">
      <div className="fc-film-game-plan-backdrop" onClick={onClose} aria-hidden />
      <div className="fc-film-game-plan-panel">
        <header className="fc-film-game-plan-header">
          <h2>Add to game plan</h2>
          <p>
            Tag what you see at {timeLabel || "0:00"} from &quot;{sessionTitle}&quot;
          </p>
        </header>

        {!plans.length ? (
          <div className="fc-film-game-plan-body">
            <p className="fc-film-game-plan-empty">
              No active game plans. Create one under Library → Game Plan first.
            </p>
          </div>
        ) : (
          <>
            <div className="fc-film-game-plan-body">
              <h3 className="fc-film-game-plan-section-title">Game plan</h3>
              <ul className="fc-film-game-plan-plan-list">
                {plans.map((plan) => {
                  const selected = plan.id === selectedPlanId;
                  return (
                    <li key={plan.id}>
                      <button
                        type="button"
                        className={`fc-film-game-plan-plan-row${selected ? " selected" : ""}`}
                        onClick={() => setSelectedPlanId(plan.id)}
                      >
                        <span className="fc-film-game-plan-plan-title">{plan.title}</span>
                        <span className="fc-film-game-plan-plan-meta">
                          {plan.gameDate} · vs {plan.opponent}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <h3 className="fc-film-game-plan-section-title">Tendency</h3>
              <div className="fc-film-game-plan-kinds" role="group" aria-label="Tendency type">
                {OPPONENT_TENDENCY_PRESETS.map((preset) => (
                  <button
                    key={preset.kind}
                    type="button"
                    className="fc-film-game-plan-kind"
                    disabled={!selectedPlanId || busy}
                    onClick={() => void handlePickKind(preset.kind)}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="fc-film-game-plan-kind fc-film-game-plan-kind-other"
                  disabled={!selectedPlanId || busy}
                  onClick={() => void handlePickKind("other")}
                >
                  Other
                </button>
              </div>
            </div>
          </>
        )}

        <footer className="fc-film-game-plan-footer">
          <button type="button" className="fc-film-game-plan-cancel" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
