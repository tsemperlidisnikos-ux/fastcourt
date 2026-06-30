"use client";

import { useEffect } from "react";
import {
  drainHomeworkAckQueue,
  subscribeHomeworkAcks,
} from "@/lib/game-plan/player-homework-ack";
import { useOrganizerStore } from "@/stores/organizer-store";

export function HomeworkAckBootstrap() {
  const applyPlayerHomeworkAck = useOrganizerStore((s) => s.applyPlayerHomeworkAck);
  const hydrated = useOrganizerStore((s) => s.hydrated);

  useEffect(() => {
    if (!hydrated) return;

    const applyQueued = () => {
      for (const event of drainHomeworkAckQueue()) {
        void applyPlayerHomeworkAck(
          event.homeworkId,
          event.playerId,
          event.token,
          event.type,
        );
      }
    };

    applyQueued();
    return subscribeHomeworkAcks((event) => {
      void applyPlayerHomeworkAck(
        event.homeworkId,
        event.playerId,
        event.token,
        event.type,
      );
    });
  }, [applyPlayerHomeworkAck, hydrated]);

  return null;
}
