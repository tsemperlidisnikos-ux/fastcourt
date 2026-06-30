/** Marks an element whose right-click opens an app context menu. */
export const FC_CONTEXT_MENU_TRIGGER_ATTR = "data-fc-context-menu-trigger";

export function isContextMenuTrigger(element: Element | null): boolean {
  return !!element?.closest(`[${FC_CONTEXT_MENU_TRIGGER_ATTR}]`);
}

/** Native browser menu — only on our open context menu panel (or explicit opt-in). */
export function shouldAllowNativeContextMenu(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(".fc-library-play-context-menu")) return true;
  if (target.closest("[data-fc-allow-native-context-menu]")) return true;
  return false;
}

export function shouldBlockContextMenu(target: EventTarget | null): boolean {
  if (shouldAllowNativeContextMenu(target)) return false;
  if (target instanceof Element && isContextMenuTrigger(target)) return false;
  return true;
}

export function blockNativeContextMenu(event: {
  preventDefault: () => void;
  stopPropagation?: () => void;
}) {
  event.preventDefault();
}
