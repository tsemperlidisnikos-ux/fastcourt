"use client";

import "@/styles/fc-film-reel-share.css";
import { PwaBootstrap } from "@/components/pwa/PwaBootstrap";
import { AppLogoSync } from "@/components/settings/AppLogoSync";
import { CourtWoodTextureBootstrap } from "@/components/designer/CourtWoodTextureBootstrap";
import { TeamInviteBootstrap } from "@/components/auth/TeamInviteBootstrap";
import { PlayerPortalOverlay } from "@/components/share/PlayerPortalOverlay";
import { PlayerRosterModal } from "@/components/share/PlayerRosterModal";
import { PlayerShareSendModal } from "@/components/share/PlayerShareSendModal";
import { HomeworkShareOverlay } from "@/components/share/HomeworkShareOverlay";
import { HomeworkAckBootstrap } from "@/components/share/HomeworkAckBootstrap";
import { GamePlanShareOverlay } from "@/components/share/GamePlanShareOverlay";
import { GameDayShareOverlay } from "@/components/share/GameDayShareOverlay";
import { PracticeShareOverlay } from "@/components/share/PracticeShareOverlay";
import { FilmReelShareOverlay } from "@/components/share/FilmReelShareOverlay";
import { ShareBootstrap } from "@/components/share/ShareBootstrap";
import { AppDialogHost } from "@/components/ui/AppDialogHost";
import { ContextMenuGuard } from "@/components/ui/ContextMenuGuard";
import { ViewportProfileProvider } from "@/components/shell/ViewportProfileProvider";

export function ShareProviders({ children }: { children: React.ReactNode }) {
  return (
    <ViewportProfileProvider>
      <AppLogoSync />
      <CourtWoodTextureBootstrap />
      <ContextMenuGuard />
      <AppDialogHost />
      <TeamInviteBootstrap />
      <ShareBootstrap />
      <HomeworkAckBootstrap />
      <PlayerPortalOverlay />
      <PlayerRosterModal />
      <PlayerShareSendModal />
      <PracticeShareOverlay />
      <GamePlanShareOverlay />
      <GameDayShareOverlay />
      <HomeworkShareOverlay />
      <FilmReelShareOverlay />
      <PwaBootstrap />
      {children}
    </ViewportProfileProvider>
  );
}
