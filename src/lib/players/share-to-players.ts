import { defaultRosterTeam } from "@/lib/players/team-options";
import { buildPracticeShareItems } from "@/lib/practice/practice-items";
import {
  buildSmartPlaybookUrl,
  buildSmartPracticeUrl,
  buildSmartPlayUrl,
  type SmartShareResult,
} from "@/lib/share/share-link";
import { useOrganizerStore } from "@/stores/organizer-store";
import { appNotice } from "@/stores/dialog-store";
import { useShareStore } from "@/stores/share-store";
import type { StoredPlay } from "@/types/library";
import type { PlaybookSection, PracticeSession } from "@/types/library-meta";
import type { PlayerShareContentType } from "@/types/player-roster";

export type ShareableContent =
  | { kind: "play"; play: StoredPlay }
  | { kind: "drill"; play: StoredPlay }
  | {
      kind: "playbook";
      section: Pick<PlaybookSection, "name" | "team" | "subtitle">;
      plays: StoredPlay[];
    }
  | {
      kind: "practice";
      session: PracticeSession;
      playsById: Map<string, StoredPlay>;
    };

function resolveShareMeta(content: ShareableContent): {
  result: SmartShareResult;
  contentName: string;
  team: string;
  contentType: PlayerShareContentType;
} {
  switch (content.kind) {
    case "play":
      return {
        result: buildSmartPlayUrl(content.play, { playerView: true }),
        contentName: content.play.title || "Play",
        team: content.play.team || "No Team",
        contentType: "play",
      };
    case "drill":
      return {
        result: buildSmartPlayUrl(content.play, { playerView: true }),
        contentName: content.play.title || "Drill",
        team: content.play.team || "No Team",
        contentType: "drill",
      };
    case "playbook":
      return {
        result: buildSmartPlaybookUrl(content.section, content.plays, {
          playerView: true,
        }),
        contentName: content.section.name || "Playbook",
        team: content.section.team || "No Team",
        contentType: "playbook",
      };
    case "practice": {
      const items = buildPracticeShareItems(
        content.session,
        content.playsById,
      );
      return {
        result: buildSmartPracticeUrl(content.session, items),
        contentName: content.session.title || "Practice",
        team: content.session.team || "No Team",
        contentType: "practice",
      };
    }
  }
}

function resolveShareTeam(rawTeam: string) {
  const configuredTeams = useOrganizerStore.getState().teams;
  return defaultRosterTeam(configuredTeams, rawTeam);
}

export function shareContentToPlayers(content: ShareableContent): boolean {
  const { result, contentName, team: rawTeam, contentType } = resolveShareMeta(content);
  const team = resolveShareTeam(rawTeam);
  if (!result.ok || !result.url) {
    appNotice(
      "Share link failed",
      result.error === "too_long"
        ? "This content is too large for a share link. Try sharing fewer items or export JSON instead."
        : "Could not create share link.",
    );
    return false;
  }
  useShareStore.getState().openSendModal({
    url: result.url,
    contentName,
    team,
    contentType,
  });
  return true;
}

export function sharePlaysAsPlaybookToPlayers(
  plays: StoredPlay[],
  options: {
    team?: string;
    name?: string;
    subtitle?: string;
  } = {},
): boolean {
  if (!plays.length) {
    appNotice("Nothing to share", "Select one or more plays to share.");
    return false;
  }

  const rawTeam = options.team || plays[0]?.team || "No Team";
  const team = resolveShareTeam(rawTeam);
  const playLabel = plays.length === 1 ? "play" : "plays";
  const name =
    options.name ||
    (plays.length === 1
      ? plays[0].title || "Playbook"
      : `${team} — Selected plays`);
  const subtitle =
    options.subtitle || `${plays.length} ${playLabel}`;

  return shareContentToPlayers({
    kind: "playbook",
    section: { name, team, subtitle },
    plays,
  });
}
