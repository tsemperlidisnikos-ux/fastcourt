import {
  normalizeWhatsAppPhone,
  playerRosterDisplayName,
} from "@/lib/players/player-roster";
import type { PlayerRosterEntry } from "@/types/player-roster";

export function getDefaultPlayerShareMessage(contentName: string) {
  const label = String(contentName || "our content").trim() || "our content";
  return `Hi {name},\n\nHere is ${label}:\n{link}\n\nOpen on your phone or tablet — no login needed.`;
}

export function buildPlayerShareMessage(
  template: string,
  player: Pick<PlayerRosterEntry, "name"> | null,
  url: string,
) {
  const name = String(player?.name || "there").trim() || "there";
  return String(template || "")
    .replace(/\{name\}/g, name)
    .replace(/\{link\}/g, url);
}

export function buildEmailShareLink(
  player: PlayerRosterEntry,
  subject: string,
  template: string,
  url: string,
) {
  const body = buildPlayerShareMessage(template, player, url);
  return `mailto:${encodeURIComponent(player.email!)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildBccEmailShareLink(
  players: PlayerRosterEntry[],
  subject: string,
  template: string,
  url: string,
) {
  const usesName = template.includes("{name}");
  const body = usesName
    ? buildPlayerShareMessage(template, players[0], url)
    : buildPlayerShareMessage(template, { name: "team" }, url);
  const bcc = players.map((p) => String(p.email).trim()).join(",");
  return `mailto:?bcc=${encodeURIComponent(bcc)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function buildWhatsAppShareLink(
  player: PlayerRosterEntry,
  template: string,
  url: string,
) {
  const phone = normalizeWhatsAppPhone(player.phone || "");
  if (!phone) return null;
  const text = buildPlayerShareMessage(template, player, url);
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function buildCopyMessagesBlock(
  players: PlayerRosterEntry[],
  template: string,
  url: string,
) {
  return players
    .map(
      (player) =>
        `${playerRosterDisplayName(player)}:\n${buildPlayerShareMessage(template, player, url)}`,
    )
    .join("\n\n---\n\n");
}
