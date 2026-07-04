export interface PracticeLiveBroadcast {
  sessionId: string;
  currentIndex: number;
  completed: number[];
}

const CHANNEL_NAME = "fastcourt-practice-live";

export function publishPracticeLiveState(payload: PracticeLiveBroadcast) {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.postMessage(payload);
  channel.close();
}

export function subscribePracticeLiveState(
  onMessage: (payload: PracticeLiveBroadcast) => void,
) {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<PracticeLiveBroadcast>) => {
    if (!event.data?.sessionId) return;
    onMessage(event.data);
  };
  return () => channel.close();
}
