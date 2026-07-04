"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_LIBRARY_NAV_MODULES,
  LIBRARY_NAV_MODULES_CHANGED_EVENT,
  LIBRARY_NAV_MODULES_STORAGE_KEY,
  loadLibraryNavModules,
} from "@/lib/settings/library-nav-modules";
import type { LibraryNavModulesConfig } from "@/types/library-nav-modules";

export function useLibraryNavModules(): LibraryNavModulesConfig {
  const [modules, setModules] = useState(DEFAULT_LIBRARY_NAV_MODULES);

  const refresh = useCallback(() => {
    setModules(loadLibraryNavModules());
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key === LIBRARY_NAV_MODULES_STORAGE_KEY) {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(LIBRARY_NAV_MODULES_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(LIBRARY_NAV_MODULES_CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return modules;
}
