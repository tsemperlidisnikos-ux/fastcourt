"use client";

import { useSettingsStore } from "@/stores/settings-store";
import {
  benchCategoriesForPrint,
  formatGamePlanDate,
  formatGamePlanHomeAway,
  resolveGamePlanEntryLabel,
} from "@/lib/game-plan/game-plan-items";
import {
  resolvePdfCoverTeam,
  resolvePdfFooterText,
} from "@/lib/settings/pdf-brand-export";
import type { GamePlan } from "@/types/library-meta";
import type { StoredPlay } from "@/types/library";

export function GamePlanBenchPrintDocument({
  plan,
  playsById,
}: {
  plan: GamePlan;
  playsById: Map<string, StoredPlay>;
}) {
  const pdfBrand = useSettingsStore((s) => s.pdfBrand);
  const coverTeam = resolvePdfCoverTeam(pdfBrand, plan.team);
  const footerText = resolvePdfFooterText(pdfBrand);
  const categories = benchCategoriesForPrint(plan);
  const homeAway = formatGamePlanHomeAway(plan.homeAway);
  const metaParts = [
    formatGamePlanDate(plan.gameDate),
    homeAway,
    plan.location?.trim(),
  ].filter(Boolean);

  return (
    <div className="fc-game-plan-bench-print-doc">
      <header className="fc-game-plan-bench-print-header">
        {coverTeam ? (
          <div className="fc-game-plan-bench-print-team">{coverTeam}</div>
        ) : null}
        <h1 className="fc-game-plan-bench-print-title">
          {plan.title || `vs ${plan.opponent}`}
        </h1>
        {metaParts.length ? (
          <p className="fc-game-plan-bench-print-meta">{metaParts.join(" · ")}</p>
        ) : null}
      </header>

      <div className="fc-game-plan-bench-print-grid">
        {categories.map((group) => (
          <section key={group.categoryId} className="fc-game-plan-bench-print-col">
            <h2 className="fc-game-plan-bench-print-col-title">{group.label}</h2>
            <ul className="fc-game-plan-bench-print-col-list">
              {group.rows.map((entry) => {
                const play = entry.playId ? playsById.get(entry.playId) : undefined;
                const label = resolveGamePlanEntryLabel(entry, play);
                return (
                  <li key={entry.id} className="fc-game-plan-bench-print-call">
                    {label}
                    {entry.notes?.trim() ? (
                      <span className="fc-game-plan-bench-print-call-note">
                        {entry.notes.trim()}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {plan.scoutingNotes?.trim() ? (
        <footer className="fc-game-plan-bench-print-keys">
          <strong>Keys</strong>
          <p>{plan.scoutingNotes.trim()}</p>
        </footer>
      ) : null}

      {footerText ? (
        <div className="fc-game-plan-bench-print-footer">{footerText}</div>
      ) : null}
    </div>
  );
}
