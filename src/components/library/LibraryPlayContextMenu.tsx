"use client";

import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface LibraryPlayContextMenuState {
  x: number;
  y: number;
  playId: string;
}

interface Props {
  menu: LibraryPlayContextMenuState;
  targetCount: number;
  teams: string[];
  series: string[];
  onClose: () => void;
  onOpenPlay: () => void;
  onDuplicate: () => void;
  onEditDetails: () => void;
  onChangeTeam: (team: string) => void;
  onChangeSeries: (series: string) => void;
  onCreatePlaybook: () => void;
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

export function LibraryPlayContextMenu({
  menu,
  targetCount,
  teams,
  series,
  onClose,
  onOpenPlay,
  onDuplicate,
  onEditDetails,
  onChangeTeam,
  onChangeSeries,
  onCreatePlaybook,
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
  }, [menu.x, menu.y, teams.length, series.length, targetCount]);

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
      className="fc-library-play-context-menu"
      role="menu"
      aria-label="Play actions"
      style={{ left: position.left, top: position.top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        className="fc-library-play-context-item"
        role="menuitem"
        onClick={() => run(onOpenPlay)}
      >
        Edit Play
      </button>
      <button
        type="button"
        className="fc-library-play-context-item"
        role="menuitem"
        onClick={() => run(onDuplicate)}
      >
        Duplicate Play
      </button>
      <button
        type="button"
        className="fc-library-play-context-item"
        role="menuitem"
        onClick={() => run(onEditDetails)}
      >
        Edit Play Details
      </button>
      <div className="fc-library-play-context-submenu-wrap">
        <button
          type="button"
          className="fc-library-play-context-item fc-library-play-context-item--submenu"
          role="menuitem"
          aria-haspopup="menu"
        >
          Change Team To
          <span className="fc-library-play-context-chevron" aria-hidden="true">
            ›
          </span>
        </button>
        <div className="fc-library-play-context-submenu" role="menu">
          {teams.length ? (
            teams.map((team) => (
              <button
                key={team}
                type="button"
                className="fc-library-play-context-item"
                role="menuitem"
                onClick={() => run(() => onChangeTeam(team))}
              >
                {team}
              </button>
            ))
          ) : (
            <span className="fc-library-play-context-empty">No teams</span>
          )}
        </div>
      </div>
      <div className="fc-library-play-context-submenu-wrap">
        <button
          type="button"
          className="fc-library-play-context-item fc-library-play-context-item--submenu"
          role="menuitem"
          aria-haspopup="menu"
        >
          Change Series To
          <span className="fc-library-play-context-chevron" aria-hidden="true">
            ›
          </span>
        </button>
        <div className="fc-library-play-context-submenu" role="menu">
          <button
            type="button"
            className="fc-library-play-context-item"
            role="menuitem"
            onClick={() => run(() => onChangeSeries(""))}
          >
            —
          </button>
          {series.map((name) => (
            <button
              key={name}
              type="button"
              className="fc-library-play-context-item"
              role="menuitem"
              onClick={() => run(() => onChangeSeries(name))}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="fc-library-play-context-item"
        role="menuitem"
        onClick={() => run(onCreatePlaybook)}
      >
        Create Playbook ({targetCount})
      </button>
      <button
        type="button"
        className="fc-library-play-context-item fc-library-play-context-item--danger"
        role="menuitem"
        onClick={() => run(onDelete)}
      >
        Delete Play
      </button>
    </div>,
    document.body,
  );
}
