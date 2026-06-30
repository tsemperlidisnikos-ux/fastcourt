"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  applyHtmlViewportAttributes,
  applyLaptopViewportMeta,
  buildViewportProfile,
  clearHtmlViewportAttributes,
  restoreDefaultViewportMeta,
  shouldEnableLaptopLock,
  type ViewportProfile,
} from "@/lib/viewport/laptop-lock";

function applyProfile(laptopLock: boolean): ViewportProfile {
  const profile = buildViewportProfile(laptopLock);
  applyHtmlViewportAttributes(profile, laptopLock);
  if (laptopLock) {
    applyLaptopViewportMeta(profile.scale);
  } else {
    restoreDefaultViewportMeta();
  }
  return profile;
}

export function ViewportProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const laptopLock = shouldEnableLaptopLock(pathname);

  useEffect(() => {
    function sync() {
      applyProfile(laptopLock);
    }

    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    const coarseMq = window.matchMedia("(pointer: coarse)");
    coarseMq.addEventListener("change", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      coarseMq.removeEventListener("change", sync);
      clearHtmlViewportAttributes();
      restoreDefaultViewportMeta();
    };
  }, [laptopLock]);

  return children;
}
