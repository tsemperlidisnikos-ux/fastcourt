"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface PlayerContextMenuState {
  x: number;
  y: number;
  playerId: string;
}

interface Props {
  menu: PlayerContextMenuState;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function clampMenuPosition(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const pad = 8;
  const maxX = Math.max(pad, window.innerWidth - width - pad);
  const maxY = Math.max(pad, window.innerHeight - height - pad);
  return {
    left: Math.min(Math.max(pad, x), maxX),
    top: Math.min(Math.max(pad, y), maxY),
  };
}

export function PlayerContextMenu({
  menu,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ left: menu.x, top: menu.y });

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPosition(clampMenuPosition(menu.x, menu.y, rect.width, rect.height));
  }, [menu.x, menu.y]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      onClose();
    }
    function onScroll() {
      onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  if (!mounted) return null;

  const run = (action: () => void) => {
    action();
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fc-library-play-context-menu fc-players-context-menu"
      role="menu"
      aria-label="Player actions"
      style={{ left: position.left, top: position.top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className="fc-library-play-context-item"
        role="menuitem"
        onClick={() => run(onEdit)}
      >
        Edit Player
      </button>
      <button
        type="button"
        className="fc-library-play-context-item fc-library-play-context-item--danger"
        role="menuitem"
        onClick={() => run(onDelete)}
      >
        Delete Player
      </button>
    </div>,
    document.body,
  );
}
