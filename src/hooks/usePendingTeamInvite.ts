"use client";

import { useSyncExternalStore } from "react";
import {
  getPendingInvite,
  type PendingTeamInvite,
} from "@/lib/auth/team-invite";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

export function usePendingTeamInvite(): PendingTeamInvite | null {
  return useSyncExternalStore(
    subscribe,
    () => getPendingInvite(),
    () => null,
  );
}
