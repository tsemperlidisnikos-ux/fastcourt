"use client";

import { useEffect } from "react";
import { shouldBlockContextMenu, blockNativeContextMenu } from "@/lib/ui/context-menu-policy";

/** Block browser context menus except on whitelisted triggers. */
export function ContextMenuGuard() {
  useEffect(() => {
    function onContextMenu(event: MouseEvent) {
      if (!shouldBlockContextMenu(event.target)) return;
      blockNativeContextMenu(event);
    }

    document.addEventListener("contextmenu", onContextMenu, true);
    return () => document.removeEventListener("contextmenu", onContextMenu, true);
  }, []);

  return null;
}
