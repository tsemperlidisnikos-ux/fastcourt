"use client";

import { useEffect } from "react";
import { consumeInviteFromUrlHash } from "@/lib/auth/team-invite";

export function TeamInviteBootstrap() {
  useEffect(() => {
    consumeInviteFromUrlHash();
  }, []);
  return null;
}
