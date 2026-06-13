"use client";

import { useEffect, useState } from "react";

export type DeviceClass = "tablet" | "laptop" | "desktop-wide";

function detectDeviceClass(): DeviceClass {
  if (typeof window === "undefined") return "laptop";
  const w = window.innerWidth;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (w < 900 || (coarse && w < 1200)) return "tablet";
  if (w >= 1600) return "desktop-wide";
  return "laptop";
}

export function useDeviceClass(): DeviceClass {
  const [deviceClass, setDeviceClass] = useState<DeviceClass>("laptop");

  useEffect(() => {
    function apply() {
      const next = detectDeviceClass();
      setDeviceClass(next);
      document.documentElement.setAttribute("data-device-class", next);
    }
    apply();
    window.addEventListener("resize", apply);
    return () => {
      window.removeEventListener("resize", apply);
      document.documentElement.removeAttribute("data-device-class");
    };
  }, []);

  return deviceClass;
}
