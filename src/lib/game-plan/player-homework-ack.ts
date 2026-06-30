import type { PlayerHomeworkAssignment } from "@/types/library-meta";

export const HOMEWORK_ACK_CHANNEL = "fc_homework_ack_v1";
export const HOMEWORK_ACK_STORAGE_KEY = "fc_homework_ack_queue_v1";

export type HomeworkAckType = "open" | "studied";

export interface HomeworkAckEvent {
  homeworkId: string;
  playerId: string;
  token: string;
  type: HomeworkAckType;
  at: string;
  playerName?: string;
}

export function newHomeworkPlayerToken() {
  return `hwt_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function ensureHomeworkPlayerToken(
  assignment: PlayerHomeworkAssignment,
  playerId: string,
) {
  const tokens = { ...(assignment.playerTokens || {}) };
  if (!tokens[playerId]) {
    tokens[playerId] = newHomeworkPlayerToken();
  }
  return tokens;
}

export function validateHomeworkPlayerToken(
  assignment: PlayerHomeworkAssignment,
  playerId: string,
  token: string,
) {
  if (!playerId.trim() || !token.trim()) return false;
  return assignment.playerTokens?.[playerId] === token;
}

function readAckQueue(): HomeworkAckEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HOMEWORK_ACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAckQueue(events: HomeworkAckEvent[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HOMEWORK_ACK_STORAGE_KEY, JSON.stringify(events.slice(-200)));
}

export function queueHomeworkAck(event: HomeworkAckEvent) {
  if (typeof window === "undefined") return;
  const queue = readAckQueue();
  queue.push(event);
  writeAckQueue(queue);
  try {
    const channel = new BroadcastChannel(HOMEWORK_ACK_CHANNEL);
    channel.postMessage(event);
    channel.close();
  } catch {
    // ignore
  }
}

export function drainHomeworkAckQueue(): HomeworkAckEvent[] {
  const queue = readAckQueue();
  if (queue.length) writeAckQueue([]);
  return queue;
}

export function subscribeHomeworkAcks(
  onEvent: (event: HomeworkAckEvent) => void,
) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key !== HOMEWORK_ACK_STORAGE_KEY) return;
    for (const row of drainHomeworkAckQueue()) onEvent(row);
  };

  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(HOMEWORK_ACK_CHANNEL);
    channel.onmessage = (event: MessageEvent<HomeworkAckEvent>) => {
      if (event.data?.homeworkId) onEvent(event.data);
    };
  } catch {
    // ignore
  }

  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("storage", onStorage);
    channel?.close();
  };
}
