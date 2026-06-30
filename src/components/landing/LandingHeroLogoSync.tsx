"use client";

import { useEffect } from "react";
import { useAppLogoSrc } from "@/hooks/useAppLogoSrc";

const LANDING_HERO_LOGO_ID = "fc-landing-hero-logo";

/** Keeps the server-rendered hero logo in sync when admin changes the app logo. */
export function LandingHeroLogoSync() {
  const src = useAppLogoSrc();

  useEffect(() => {
    const img = document.getElementById(LANDING_HERO_LOGO_ID);
    if (img instanceof HTMLImageElement && img.src !== src) {
      img.src = src;
    }
  }, [src]);

  return null;
}
