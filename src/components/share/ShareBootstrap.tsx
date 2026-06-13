"use client";

import { useEffect } from "react";
import {
  decodeFromHash,
  shareMinifiedToStoredPlay,
} from "@/lib/share/share-link";
import { useShareStore } from "@/stores/share-store";

export function ShareBootstrap() {
  const setPlayerShareSession = useShareStore((s) => s.setPlayerShareSession);
  const setPracticeShareSession = useShareStore((s) => s.setPracticeShareSession);

  useEffect(() => {
    const payload = decodeFromHash(window.location.hash);
    if (!payload) return;

    if (payload.type === "playbook") {
      const plays = payload.plays.map((play, index) =>
        shareMinifiedToStoredPlay(play, index),
      );
      setPlayerShareSession({
        section: payload.section,
        plays,
        playerView: !!payload.playerView,
      });
    } else if (payload.type === "play") {
      setPlayerShareSession({
        section: {
          name: payload.play.title || "Shared play",
          team: payload.play.team || "",
        },
        plays: [shareMinifiedToStoredPlay(payload.play)],
        playerView: !!payload.playerView,
      });
    } else if (payload.type === "practice") {
      setPracticeShareSession({
        session: payload.session,
        items: payload.items,
        stageRef: payload.stageRef,
      });
    }

    const cleanUrl =
      window.location.pathname + window.location.search;
    window.history.replaceState(null, "", cleanUrl);
  }, [setPlayerShareSession, setPracticeShareSession]);

  return null;
}
