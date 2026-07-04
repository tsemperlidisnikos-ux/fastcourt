"use client";

import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import { useClientMounted } from "@/hooks/useClientMounted";
import { loginSignedOutUrl } from "@/lib/auth/safe-next-path";
import { resetLibraryOnSignOut } from "@/lib/cloud/library-sync";
import { createClient, isCloudEnabled } from "@/lib/supabase/client";
import { listStoredPlays } from "@/lib/library/idb";
import { useAuthStore } from "@/stores/auth-store";
import { useLibraryStore } from "@/stores/library-store";
import { useOrganizerStore } from "@/stores/organizer-store";
import { useShareStore } from "@/stores/share-store";
import {
  buildSmartPlaybookUrl,
  copyShareResult,
} from "@/lib/share/share-link";
import { appNotice } from "@/stores/dialog-store";

type UserMenuVariant = "topbar" | "designer";

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function topCounts<T extends string>(
  values: (T | undefined)[],
  limit = 5,
): [string, number][] {
  const map = new Map<string, number>();
  for (const v of values) {
    const key = (v ?? "").trim();
    if (!key) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function MenuModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const mounted = useClientMounted();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="org-user-menu-modal-overlay"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="org-user-menu-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-menu-modal-title"
      >
        <div className="org-user-menu-modal-head">
          <h2 id="user-menu-modal-title" className="org-user-menu-modal-title">
            {title}
          </h2>
          <button
            type="button"
            className="org-user-menu-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="org-user-menu-modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function UserMenu({ variant = "topbar" }: { variant?: UserMenuVariant }) {
  const router = useRouter();
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const session = useAuthStore((s) => s.session);
  const signOut = useAuthStore((s) => s.signOut);
  const items = useLibraryStore((s) => s.items);
  const playbooks = useOrganizerStore((s) => s.playbooks);
  const resolvePlaybookPlays = useOrganizerStore((s) => s.resolvePlaybookPlays);
  const openPortal = useShareStore((s) => s.openPortal);

  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const menuMounted = useClientMounted();
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const label = useMemo(() => {
    if (!session) return "User";
    return session.user.displayName;
  }, [session]);

  const closeMenu = useCallback(() => setOpen(false), []);

  const updateMenuPosition = useCallback(() => {
    const btn = btnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 8,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [open, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      closeMenu();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closeMenu]);

  async function handleSignOut() {
    closeMenu();
    if (isCloudEnabled()) {
      await createClient()?.auth.signOut();
    }
    await resetLibraryOnSignOut();
    signOut();
    window.location.replace(loginSignedOutUrl());
  }

  async function handleExportLibrary() {
    setShareOpen(false);
    try {
      const plays = await listStoredPlays();
      downloadJson("fastcourt-library-export.json", plays);
    } catch {
      downloadJson("fastcourt-library-export.json", items);
    }
  }

  const analytics = useMemo(() => {
    const plays = items.filter((i) => i.type === "play").length;
    const drills = items.filter((i) => i.type === "drill").length;
    const playbooks = items.filter((i) => i.type === "playbook").length;
    const pinned = items.filter((i) => i.favorite).length;
    const seriesRows = topCounts(items.map((i) => i.series));
    const tagRows = topCounts(items.flatMap((i) => i.tags));
    return { plays, drills, playbooks, pinned, seriesRows, tagRows };
  }, [items]);

  if (!session) return null;

  const btnClass =
    variant === "designer"
      ? "ds-fd-user-btn org-user-menu-btn"
      : "org-user-menu-btn fd-user-btn fd-topbar-user-btn";

  const menuPanel = (
    <div
      ref={menuRef}
      className="org-user-menu org-user-menu-portal"
      role="menu"
      style={menuStyle}
    >
      <div className="org-user-menu-header">
        <div>{session.user.displayName}</div>
        <div>{session.user.email}</div>
      </div>
      <button
        type="button"
        className="org-user-menu-item"
        role="menuitem"
        onClick={() => {
          closeMenu();
          setShareOpen(true);
        }}
      >
        Share &amp; export
      </button>
      <button
        type="button"
        className="org-user-menu-item"
        role="menuitem"
        onClick={() => {
          closeMenu();
          setAnalyticsOpen(true);
        }}
      >
        Library analytics
      </button>
      <button
        type="button"
        className="org-user-menu-item"
        role="menuitem"
        onClick={() => {
          closeMenu();
          router.push("/settings");
        }}
      >
        Settings
      </button>
      <button
        type="button"
        className="org-user-menu-item org-user-menu-item-danger"
        role="menuitem"
        onClick={() => void handleSignOut()}
      >
        Sign out
      </button>
    </div>
  );

  return (
    <>
      <div className="org-user-menu-wrap">
        <button
          ref={btnRef}
          type="button"
          className={btnClass}
          aria-haspopup="menu"
          aria-expanded={open}
          title="Account"
          onClick={() => setOpen((v) => !v)}
        >
          {variant === "designer" ? (
            <span className="ds-fd-user-dot" aria-hidden="true" />
          ) : null}
          <span className="org-user-menu-label">{label}</span>
          <span className="org-user-menu-chevron" aria-hidden="true">
            {variant === "topbar" ? (
              <svg
                className="org-user-menu-chevron-icon"
                viewBox="0 0 24 24"
                width="14"
                height="14"
              >
                <path fill="currentColor" d="M7 10l5 5 5-5z" />
              </svg>
            ) : (
              <span className="ds-fd-user-chevron">▾</span>
            )}
          </span>
        </button>
      </div>

      {open && menuMounted
        ? createPortal(
            <div className="fd-ui org-user-menu-portal-host">{menuPanel}</div>,
            document.body,
          )
        : null}

      <MenuModal
        open={shareOpen}
        title="Share & export"
        onClose={() => setShareOpen(false)}
      >
        <div className="org-user-menu-action-list">
          <button
            type="button"
            className="org-user-menu-action-btn"
            onClick={() => {
              setShareOpen(false);
              openPortal();
            }}
          >
            Share with players
          </button>
          <button
            type="button"
            className="org-user-menu-action-btn"
            onClick={async () => {
              setShareOpen(false);
              const section = playbooks.find((pb) => pb.playRefs.length > 0) ?? playbooks[0];
              if (!section) {
                appNotice(
                  "No playbook",
                  "Create a playbook with plays first.",
                );
                return;
              }
              const plays = resolvePlaybookPlays(section);
              if (!plays.length) {
                appNotice(
                  "Empty playbook",
                  "This playbook has no plays to share.",
                );
                return;
              }
              const result = buildSmartPlaybookUrl(section, plays, {
                playerView: false,
              });
              await copyShareResult(result, section.name);
            }}
          >
            Share playbook link
          </button>
          <button
            type="button"
            className="org-user-menu-action-btn"
            onClick={() => {
              setShareOpen(false);
              router.push("/library?tab=gameplan");
            }}
          >
            Game Plan
          </button>
          <button
            type="button"
            className="org-user-menu-action-btn"
            onClick={() => {
              setShareOpen(false);
              router.push("/library?tab=playbooks");
            }}
          >
            Playbook PDF
          </button>
          <button
            type="button"
            className="org-user-menu-action-btn org-user-menu-action-btn-primary"
            onClick={() => void handleExportLibrary()}
          >
            Export library (JSON)
          </button>
        </div>
      </MenuModal>

      <MenuModal
        open={analyticsOpen}
        title="Library analytics"
        onClose={() => setAnalyticsOpen(false)}
      >
        <div className="library-analytics-summary">
          <div className="library-analytics-stat">
            <span>{items.length}</span>
            <label>Total items</label>
          </div>
          <div className="library-analytics-stat">
            <span>{analytics.plays}</span>
            <label>Plays</label>
          </div>
          <div className="library-analytics-stat">
            <span>{analytics.drills}</span>
            <label>Drills</label>
          </div>
          <div className="library-analytics-stat">
            <span>{analytics.pinned}</span>
            <label>Favorites</label>
          </div>
          <div className="library-analytics-stat">
            <span>{analytics.playbooks}</span>
            <label>Playbooks</label>
          </div>
        </div>
        <div className="library-analytics-tables">
          <div>
            <h4>Top series</h4>
            <table className="library-analytics-table">
              <thead>
                <tr>
                  <th>Series</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {analytics.seriesRows.length ? (
                  analytics.seriesRows.map(([name, count]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>No series yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div>
            <h4>Top tags</h4>
            <table className="library-analytics-table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {analytics.tagRows.length ? (
                  analytics.tagRows.map(([name, count]) => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td>{count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2}>No tags yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </MenuModal>
    </>
  );
}
