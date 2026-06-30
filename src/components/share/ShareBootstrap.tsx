"use client";

import { useEffect } from "react";
import {
  decodeFromHash,
  shareMinifiedToStoredPlay,
} from "@/lib/share/share-link";
import { useShareStore } from "@/stores/share-store";
import { useOrganizerStore } from "@/stores/organizer-store";
import { appNotice } from "@/stores/dialog-store";

export function ShareBootstrap() {
  const setPlayerShareSession = useShareStore((s) => s.setPlayerShareSession);
  const setPracticeShareSession = useShareStore((s) => s.setPracticeShareSession);
  const setGamePlanShareSession = useShareStore((s) => s.setGamePlanShareSession);
  const setHomeworkShareSession = useShareStore((s) => s.setHomeworkShareSession);
  const setGameDayShareSession = useShareStore((s) => s.setGameDayShareSession);

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
    } else if (payload.type === "gameplan") {
      setGamePlanShareSession({
        plan: payload.plan,
        entries: payload.entries,
        stageRef: payload.stageRef,
      });
    } else if (payload.type === "homework") {
      setHomeworkShareSession({
        homeworkId: payload.homeworkId,
        player: payload.player,
        assignment: payload.assignment,
        entries: payload.entries,
        stageRef: payload.stageRef,
      });
    } else if (payload.type === "gameday") {
      setGameDayShareSession({
        planId: payload.planId,
        plan: payload.plan,
        entries: payload.entries,
        activeCategoryId: payload.activeCategoryId,
        syncToken: payload.syncToken,
        stageRef: payload.stageRef,
      });
    } else if (payload.type === "homework_ack") {
      void useOrganizerStore
        .getState()
        .applyPlayerHomeworkAck(
          payload.homeworkId,
          payload.playerId,
          payload.token,
          payload.ackType,
        )
        .then((ok) => {
          if (ok) {
            import("@/stores/dialog-store").then(({ appNotice }) => {
              appNotice(
                "Homework update",
                payload.playerName
                  ? `${payload.playerName} marked homework as ${payload.ackType === "studied" ? "studied" : "opened"}.`
                  : `Player homework ${payload.ackType} recorded.`,
              );
            });
          }
        });
    }

    const cleanUrl =
      window.location.pathname + window.location.search;
    window.history.replaceState(null, "", cleanUrl);
  }, [setPlayerShareSession, setPracticeShareSession, setGamePlanShareSession, setHomeworkShareSession, setGameDayShareSession]);

  return null;
}
