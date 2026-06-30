"use client";

import { useEffect, useState } from "react";
import {
  buildViewportProfile,
  type DeviceClass,
} from "@/lib/viewport/laptop-lock";

export type { DeviceClass };

/** Prefer ViewportProfileProvider (global). Kept for screens mounted outside app shell. */
export function useDeviceClass(laptopLock = true): DeviceClass {
  const [deviceClass, setDeviceClass] = useState<DeviceClass>("laptop");

  useEffect(() => {
    function apply() {
      const profile = buildViewportProfile(laptopLock);
      setDeviceClass(profile.deviceClass);
      document.documentElement.setAttribute("data-device-class", profile.deviceClass);
    }
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [laptopLock]);

  return deviceClass;
}
