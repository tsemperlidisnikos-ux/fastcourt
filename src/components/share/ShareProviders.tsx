"use client";

import { TeamInviteBootstrap } from "@/components/auth/TeamInviteBootstrap";
import { PlayerPortalOverlay } from "@/components/share/PlayerPortalOverlay";
import { PlayerRosterModal } from "@/components/share/PlayerRosterModal";
import { PlayerShareSendModal } from "@/components/share/PlayerShareSendModal";
import { PracticeShareOverlay } from "@/components/share/PracticeShareOverlay";
import { ShareBootstrap } from "@/components/share/ShareBootstrap";
import { AppDialogHost } from "@/components/ui/AppDialogHost";

export function ShareProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppDialogHost />
      <TeamInviteBootstrap />
      <ShareBootstrap />
      <PlayerPortalOverlay />
      <PlayerRosterModal />
      <PlayerShareSendModal />
      <PracticeShareOverlay />
      {children}
    </>
  );
}
