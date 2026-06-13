"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LINE_ACTION_CHOICES } from "@/lib/designer/action-constants";
import { APP_BUILD } from "@/lib/config";
import { blankStoredPlay } from "@/lib/library/convert";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import { ActionSequencePanel } from "@/components/designer/ActionSequencePanel";
import { CourtWhiteboardToolbar } from "@/components/designer/CourtWhiteboardToolbar";
import { NotesFormatToolbar } from "@/components/designer/NotesFormatToolbar";
import { FormationModal } from "@/components/designer/FormationModal";
import type { FormationKey } from "@/lib/designer/formations";
import { LineThicknessControl } from "@/components/designer/LineThicknessControl";
import { ConeToolIcon } from "@/components/designer/ConeMarker";
import { LineTypeBar } from "@/components/designer/LineTypeBar";
import { ShadowTypeBar } from "@/components/designer/ShadowTypeBar";
import { ZoneTypeBar } from "@/components/designer/ZoneTypeBar";
import { LineTypeModal } from "@/components/designer/LineTypeModal";
import { ImportFrameModal } from "@/components/designer/ImportFrameModal";
import {
  PlayDetailsModal,
  type PlayDetailsValues,
} from "@/components/library/PlayDetailsModal";
import { DesignerShortcutsModal } from "@/components/designer/DesignerShortcutsModal";
import { PresentationOverlay } from "@/components/library/PresentationOverlay";
import { LibraryPrintOverlay } from "@/components/library/LibraryPrintOverlay";
import { downloadDataUrl, sanitizeExportFilename } from "@/lib/designer/download";
import type { CourtCanvasHandle } from "@/components/designer/CourtCanvas";
import { UserMenu } from "@/components/shell/UserMenu";
import { useLibraryStore } from "@/stores/library-store";
import { useDesignerStore } from "@/stores/designer-store";
import { useOrganizerStore } from "@/stores/organizer-store";
import { useSettingsStore } from "@/stores/settings-store";
import { appConfirm, appNotice } from "@/stores/dialog-store";
import type { DesignerTool } from "@/types/designer";
import type { StoredPlay } from "@/types/library";

const CourtCanvas = dynamic(() => import("@/components/designer/CourtCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-[#64748b]">
      Loading court…
    </div>
  ),
});

const TOOL_GROUPS: Array<{
  label: string;
  tools: Array<{ id: DesignerTool; name: string; icon: string; shortcut?: string }>;
}> = [
  {
    label: "Positions",
    tools: [
      { id: "select", name: "Select", icon: "✎", shortcut: "V" },
      { id: "offense", name: "Offense", icon: "○", shortcut: "O / P" },
      { id: "defense", name: "Defense", icon: "✕", shortcut: "X" },
      { id: "delete", name: "Delete", icon: "🗑", shortcut: "" },
    ],
  },
  {
    label: "Actions",
    tools: [
      { id: "line", name: "Line", icon: "／", shortcut: "L / F" },
      { id: "shoot", name: "Shot", icon: "🏀", shortcut: "S" },
    ],
  },
  {
    label: "Miscellaneous",
    tools: [
      { id: "text", name: "Text", icon: "Aa", shortcut: "" },
      { id: "label", name: "Label", icon: "T", shortcut: "" },
      { id: "cone", name: "Cone", icon: "▲", shortcut: "" },
      { id: "flag", name: "Flag", icon: "⚑", shortcut: "" },
      { id: "shadow", name: "Shadows", icon: "▬", shortcut: "" },
      { id: "zone", name: "Zone", icon: "▣", shortcut: "" },
    ],
  },
];

export function DesignerScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get("item");
  const initialPanel = searchParams.get("panel");
  const getPlayDocument = useLibraryStore((s) => s.getPlayDocument);
  const savePlayDocument = useLibraryStore((s) => s.savePlayDocument);
  const duplicatePlay = useLibraryStore((s) => s.duplicatePlay);
  const libraryItems = useLibraryStore((s) => s.items);
  const loadMeta = useOrganizerStore((s) => s.loadMeta);
  const metaHydrated = useOrganizerStore((s) => s.hydrated);
  const loadPlay = useDesignerStore((s) => s.loadPlay);
  const play = useDesignerStore((s) => s.play);
  const setTool = useDesignerStore((s) => s.setTool);
  const currentTool = useDesignerStore((s) => s.tool);
  const whiteboardInkMode = useDesignerStore((s) => s.whiteboardInkMode);
  const currentFrameIndex = useDesignerStore((s) => s.currentFrameIndex);
  const selectFrame = useDesignerStore((s) => s.selectFrame);
  const prevFrame = useDesignerStore((s) => s.prevFrame);
  const nextFrame = useDesignerStore((s) => s.nextFrame);
  const setFrameName = useDesignerStore((s) => s.setFrameName);
  const addFrame = useDesignerStore((s) => s.addFrame);
  const duplicateFrame = useDesignerStore((s) => s.duplicateFrame);
  const clearFrame = useDesignerStore((s) => s.clearFrame);
  const deleteFrame = useDesignerStore((s) => s.deleteFrame);
  const setTitle = useDesignerStore((s) => s.setTitle);
  const setCourtType = useDesignerStore((s) => s.setCourtType);
  const lineActionType = useDesignerStore((s) => s.lineActionType);
  const setLineActionType = useDesignerStore((s) => s.setLineActionType);
  const applyFormation = useDesignerStore((s) => s.applyFormation);
  const fastBuildFiveOut = useDesignerStore((s) => s.fastBuildFiveOut);
  const courtZoom = useDesignerStore((s) => s.courtZoom);
  const activeShadowType = useDesignerStore((s) => s.activeShadowType);
  const setShadowType = useDesignerStore((s) => s.setShadowType);
  const activeZoneType = useDesignerStore((s) => s.activeZoneType);
  const setZoneType = useDesignerStore((s) => s.setZoneType);
  const undo = useDesignerStore((s) => s.undo);
  const redo = useDesignerStore((s) => s.redo);
  const undoStack = useDesignerStore((s) => s.undoStack);
  const redoStack = useDesignerStore((s) => s.redoStack);
  const setFrameNotes = useDesignerStore((s) => s.setFrameNotes);
  const removeObject = useDesignerStore((s) => s.removeObject);
  const removeAction = useDesignerStore((s) => s.removeAction);
  const selectObject = useDesignerStore((s) => s.selectObject);
  const selectAction = useDesignerStore((s) => s.selectAction);
  const mirrorCurrentFrame = useDesignerStore((s) => s.mirrorCurrentFrame);
  const mirrorEntirePlay = useDesignerStore((s) => s.mirrorEntirePlay);
  const replaceCurrentFrame = useDesignerStore((s) => s.replaceCurrentFrame);

  const [storedMeta, setStoredMeta] = useState<StoredPlay | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formationOpen, setFormationOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [presentPlay, setPresentPlay] = useState<StoredPlay | null>(null);
  const [printPlay, setPrintPlay] = useState<StoredPlay | null>(null);
  const [importFrameOpen, setImportFrameOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"frames" | "anim">(() =>
    initialPanel === "anim" ? "anim" : "frames",
  );
  const notesRef = useRef<HTMLDivElement>(null);
  const notesFrameId = useRef<string | null>(null);
  const frameHeadingRef = useRef<HTMLInputElement>(null);
  const courtRef = useRef<CourtCanvasHandle>(null);
  const designerRootRef = useRef<HTMLDivElement>(null);
  const importPlayInputRef = useRef<HTMLInputElement>(null);
  const applySettings = useSettingsStore((s) => s.applyAll);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);

  const currentFrame = play.frames[currentFrameIndex];

  useEffect(() => {
    if (!settingsHydrated) hydrateSettings();
  }, [settingsHydrated, hydrateSettings]);

  useEffect(() => {
    if (!settingsHydrated) return;
    applySettings();
  }, [settingsHydrated, applySettings]);

  useEffect(() => {
    if (!metaHydrated) void loadMeta();
  }, [metaHydrated, loadMeta]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick() {
      setMenuOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "v" || key === "escape") setTool("select");
      if (key === "o" || key === "p") setTool("offense");
      if (key === "x") setTool("defense");
      if (key === "l" || key === "f" || key === "d") setTool("line");
      if (key === "s") setTool("shoot");
      if (key === "?" && !e.ctrlKey && !e.metaKey) setShortcutsOpen(true);
      if (e.ctrlKey && e.shiftKey && key === "m") {
        e.preventDefault();
        mirrorCurrentFrame();
      }

      const tool = useDesignerStore.getState().tool;
      if (tool === "line") {
        const choice = LINE_ACTION_CHOICES.find(
          (item) => item.shortcut?.toLowerCase() === key,
        );
        if (choice) setLineActionType(choice.value);
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        if (tool !== "select") return;
        const target = e.target as HTMLElement | null;
        if (
          target?.closest(
            "input, textarea, select, [contenteditable='true'], .ds-fd-notes-editor",
          )
        ) {
          return;
        }
        const { selectedActionId, selectedObjectId } = useDesignerStore.getState();
        if (selectedActionId) {
          removeAction(selectedActionId);
          selectAction(null);
          e.preventDefault();
          return;
        }
        if (selectedObjectId) {
          removeObject(selectedObjectId);
          selectObject(null);
          e.preventDefault();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    setTool,
    setLineActionType,
    removeAction,
    removeObject,
    selectAction,
    selectObject,
    mirrorCurrentFrame,
  ]);

  useEffect(() => {
    const frameId = currentFrame?.id;
    if (!frameId || !notesRef.current) return;
    if (notesFrameId.current !== frameId) {
      notesFrameId.current = frameId;
      notesRef.current.innerHTML = currentFrame?.notes ?? "";
    }
  }, [currentFrame?.id, currentFrame?.notes]);

  useEffect(() => {
    function onDocClick() {
      setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("click", onDocClick);
      return () => document.removeEventListener("click", onDocClick);
    }
  }, [menuOpen]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      setLoading(true);
      try {
        if (itemId) {
          const stored = await getPlayDocument(itemId);
          if (!active) return;
          if (stored) {
            setStoredMeta(stored);
            loadPlay({
              id: stored.id,
              title: stored.title,
              courtType: stored.courtType,
              frames: stored.frames,
            });
            return;
          }
        }

        const blank = blankStoredPlay("Untitled play");
        if (!active) return;
        setStoredMeta(blank);
        loadPlay(blank);
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [itemId, getPlayDocument, loadPlay]);

  async function handleSave(metaPatch?: Partial<StoredPlay>) {
    const notesHtml = notesRef.current?.innerHTML ?? "";
    if (notesRef.current) {
      setFrameNotes(notesHtml);
    }
    const framesWithNotes = play.frames.map((frame, index) =>
      index === currentFrameIndex ? { ...frame, notes: notesHtml } : frame,
    );
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const doc: StoredPlay = {
        id: play.id,
        title: play.title,
        courtType: play.courtType,
        frames: framesWithNotes,
        animSpeed: play.animSpeed,
        animPauseMs: play.animPauseMs,
        type: storedMeta?.type ?? "play",
        season: storedMeta?.season ?? "Default",
        team: storedMeta?.team ?? "No Team",
        series: storedMeta?.series ?? "",
        tags: storedMeta?.tags ?? [],
        playNotes: storedMeta?.playNotes,
        videoUrl: storedMeta?.videoUrl,
        favorite: storedMeta?.favorite,
        createdAt: storedMeta?.createdAt ?? now,
        updatedAt: now,
        source: storedMeta?.source ?? "manual",
        ...metaPatch,
      };
      await savePlayDocument(doc);
      setStoredMeta(doc);
      return doc;
    } finally {
      setSaving(false);
    }
  }

  async function handleDone() {
    if (notesRef.current) {
      setFrameNotes(notesRef.current.innerHTML);
    }
    await handleSave();
    router.push("/library");
  }

  const playBreadcrumb = [
    storedMeta?.season,
    storedMeta?.team,
    storedMeta?.series,
    play.title,
  ]
    .filter(Boolean)
    .join(" • ");

  async function handleDetailsSubmit(values: PlayDetailsValues) {
    const doc = await handleSave({
      title: values.title,
      courtType: values.courtType,
      type: values.type,
      season: values.season,
      team: values.team,
      series: values.series,
      tags: values.tags,
      playNotes: values.playNotes || undefined,
      videoUrl: values.videoUrl || undefined,
    });
    if (!doc) return;
    setTitle(doc.title);
    setCourtType(doc.courtType);
    loadPlay({
      id: doc.id,
      title: doc.title,
      courtType: doc.courtType,
      frames: doc.frames,
      animSpeed: doc.animSpeed,
      animPauseMs: doc.animPauseMs,
    });
    setDetailsOpen(false);
  }

  async function getCurrentStoredPlay(): Promise<StoredPlay | null> {
    return handleSave();
  }

  async function handleShareLink() {
    setMenuOpen(false);
    const doc = await getCurrentStoredPlay();
    if (!doc) return;
    const { buildSmartPlayUrl, copyShareResult } = await import("@/lib/share/share-link");
    const result = buildSmartPlayUrl(doc, { playerView: false });
    await copyShareResult(result, doc.title);
  }

  async function handlePresent() {
    setMenuOpen(false);
    const doc = await getCurrentStoredPlay();
    if (doc) setPresentPlay(doc);
  }

  async function handlePrint() {
    setMenuOpen(false);
    const doc = await getCurrentStoredPlay();
    if (doc) setPrintPlay(doc);
  }

  async function handleDuplicatePlay() {
    setMenuOpen(false);
    const doc = await getCurrentStoredPlay();
    if (!doc?.id) return;
    const copy = await duplicatePlay(doc.id);
    if (!copy) {
      appNotice("Duplicate failed", "Could not duplicate play.");
      return;
    }
    router.push(`/designer?item=${copy.id}`);
  }

  function handleExportCurrentFramePng() {
    setMenuOpen(false);
    const dataUrl = courtRef.current?.exportPng();
    if (!dataUrl) {
      appNotice("Export failed", "Could not export frame.");
      return;
    }
    const filename = `${sanitizeExportFilename(play.title)}_frame${currentFrameIndex + 1}.png`;
    downloadDataUrl(dataUrl, filename);
  }

  async function handleExportAllFramesPng() {
    setMenuOpen(false);
    const baseName = sanitizeExportFilename(play.title);
    const startIndex = currentFrameIndex;
    const selectFrameByIndex = useDesignerStore.getState().selectFrame;
    for (let i = 0; i < play.frames.length; i++) {
      selectFrameByIndex(i);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      const dataUrl = courtRef.current?.exportPng();
      if (dataUrl) downloadDataUrl(dataUrl, `${baseName}_frame${i + 1}.png`);
    }
    selectFrameByIndex(startIndex);
  }

  function handleMirrorFrame() {
    setMenuOpen(false);
    mirrorCurrentFrame();
  }

  async function handleMirrorPlay() {
    setMenuOpen(false);
    const ok = await appConfirm({
      title: "Mirror play",
      message: "Mirror every frame in this play left ↔ right?",
      confirmLabel: "Mirror",
    });
    if (!ok) return;
    mirrorEntirePlay();
  }

  function handleFullscreen() {
    setMenuOpen(false);
    const el = designerRootRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }

  function handleImportPlayClick() {
    setMenuOpen(false);
    importPlayInputRef.current?.click();
  }

  async function handleImportPlayFile(file: File) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as StoredPlay;
      if (!parsed?.frames?.length) {
        appNotice("Invalid file", "Invalid play file.");
        return;
      }
      const ok = await appConfirm({
        title: "Import play",
        message: "Replace the current play with the imported file?",
        confirmLabel: "Replace",
        danger: true,
      });
      if (!ok) return;
      const now = new Date().toISOString();
      const imported: StoredPlay = {
        ...parsed,
        id: play.id,
        updatedAt: now,
        createdAt: storedMeta?.createdAt ?? now,
        source: parsed.source ?? "manual",
      };
      loadPlay(imported);
      setStoredMeta(imported);
      await savePlayDocument(imported);
    } catch {
      appNotice("Import failed", "Could not read play file.");
    }
  }

  function handleImportPhase() {
    setMenuOpen(false);
    if (!libraryItems.length) {
      appNotice("Library empty", "No plays in library.");
      return;
    }
    setImportFrameOpen(true);
  }

  if (loading) {
    return (
      <div
        id="screen-designer"
        className="fd-play-editor-pane fd-ui designer-route active"
      >
        <p className="p-6 text-sm text-[#64748b]">Loading play…</p>
      </div>
    );
  }

  return (
    <div
      ref={designerRootRef}
      id="screen-designer"
      className={`fd-play-editor-pane fd-ui designer-route active${currentTool === "whiteboard" ? " designer-whiteboard-active" : ""}${currentTool === "whiteboard" && whiteboardInkMode === "erase" ? " designer-whiteboard-erase" : ""}`}
    >
      <header className="ds-fd-header">
        <div className="ds-fd-app-bar">
          <div className="ds-fd-app-bar-left">
            <span className="ds-fd-app-logo" aria-hidden="true">
              FC
            </span>
          </div>
          <div className="ds-fd-app-bar-center">PLAYS</div>
          <div className="ds-fd-app-bar-right">
            <UserMenu variant="designer" />
          </div>
        </div>
        <div className="ds-fd-play-bar">
          <div className="ds-fd-play-bar-main">
            <div
              id="play-title-display"
              className="ds-fd-play-breadcrumb"
              title={playBreadcrumb}
            >
              {playBreadcrumb || "Untitled play"}
            </div>
          </div>
          <div className="ds-fd-play-bar-actions">
            <button
              type="button"
              className="ds-fd-icon-btn"
              id="btn-edit-play-details"
              title="Play settings"
              aria-label="Play settings"
              onClick={() => setDetailsOpen(true)}
            >
              ⚙
            </button>
            <button
              type="button"
              className="ds-fd-done-btn fd-ds-back"
              id="btn-back"
              disabled={saving}
              onClick={() => void handleDone()}
            >
              Done
            </button>
            <div className="ds-fd-overflow-wrap">
              <button
                type="button"
                className="ds-fd-icon-btn"
                id="btn-play-overflow"
                title="More actions"
                aria-label="More actions"
                aria-expanded={menuOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
              >
                ⋯
              </button>
              {menuOpen ? (
                <div
                  className="ds-fd-overflow-menu ds-dropdown-menu"
                  role="menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={() => { setMenuOpen(false); setShortcutsOpen(true); }}>
                    Keyboard shortcuts (?)
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={() => void handlePresent()}>
                    Present
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={() => void handlePrint()}>
                    Print / PDF
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={() => void handleShareLink()}>
                    Share link
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={() => void handleDuplicatePlay()}>
                    Duplicate play
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={handleExportCurrentFramePng}>
                    Export PNG (frame)
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={() => void handleExportAllFramesPng()}>
                    Export all frames PNG
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={() => { setMenuOpen(false); appNotice("Coming soon", "Animation export (WebM/MP4) is planned for a future release."); }}>
                    Export animation (WebM)
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={handleImportPlayClick}>
                    Import play
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={handleImportPhase}>
                    Import phase from play
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={handleMirrorFrame}>
                    Mirror frame
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={() => void handleMirrorPlay()}>
                    Mirror play
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={() => { setMenuOpen(false); setSidebarTab("anim"); }}>
                    Animate
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={() => { setMenuOpen(false); setDetailsOpen(true); }}>
                    Play details
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={handleFullscreen}>
                    Fullscreen
                  </button>
                  <button type="button" className="ds-dropdown-item" role="menuitem" onClick={() => { setMenuOpen(false); router.push("/library"); }}>
                    Back to library
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <div className="ds-body">
        <aside className="ds-left-panel">
          <div className="ds-tablet-tools-head">
            <span
              className="ds-tablet-tools-frame-label"
              id="ds-tablet-tools-frame-label"
            >
              {currentFrame?.name ?? `Frame ${currentFrameIndex + 1}`}
            </span>
          </div>
          <div className="ds-panel-section">
            <div className="ds-panel-heading">Tools</div>
            <div className="ds-tool-list" id="ds-tool-list">
              {TOOL_GROUPS.map((group) => (
                <div
                  key={group.label}
                  className="ds-tool-group open"
                  data-tool-group={group.label.toLowerCase()}
                >
                  <button
                    type="button"
                    className="ds-tool-group-toggle"
                    aria-expanded="true"
                  >
                    <span className="ds-tool-group-label">{group.label}</span>
                    <span className="ds-tool-group-chevron">▾</span>
                  </button>
                  <div className="ds-tool-group-menu">
                    {group.tools.map((t) => (
                      <div key={t.id}>
                        <button
                          type="button"
                          className={`ds-tool-item${currentTool === t.id ? " active" : ""}`}
                          data-tool={t.id}
                          onClick={() => setTool(t.id)}
                        >
                          <span className="ds-tool-icon">
                            {t.id === "cone" ? <ConeToolIcon size={20} /> : t.icon}
                          </span>
                          <span className="ds-tool-name">{t.name}</span>
                        </button>
                        {t.id === "shadow" && currentTool === "shadow" ? (
                          <ShadowTypeBar
                            value={activeShadowType}
                            onChange={setShadowType}
                          />
                        ) : null}
                        {t.id === "zone" && currentTool === "zone" ? (
                          <ZoneTypeBar
                            value={activeZoneType}
                            onChange={setZoneType}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <LineThicknessControl />
        </aside>

        <main className="ds-canvas-area">
          <div className="ds-center-stack">
            <div className="ds-court-block">
              <div
                className="ds-canvas-wrap"
                id="ds-canvas-wrap"
                style={{
                  transform: `scale(${courtZoom / 100})`,
                  transformOrigin: "center center",
                }}
              >
                <CourtCanvas ref={courtRef} />
              </div>
              {currentTool === "line" ? (
                <LineTypeBar
                  value={lineActionType}
                  onChange={setLineActionType}
                />
              ) : null}
              <div className="ds-fd-court-toolbar-stack">
              <div className="ds-fd-court-toolbar" aria-label="Court tools">
                <div className="ds-fd-frame-nav" aria-label="Frame navigation">
                  <button
                    type="button"
                    className="ds-fd-tb-btn ds-fd-frame-nav-btn"
                    id="btn-prev-frame"
                    onClick={prevFrame}
                    disabled={currentFrameIndex === 0}
                    aria-label="Previous frame"
                  >
                    ‹
                  </button>
                  <span
                    className="ds-fd-frame-nav-label"
                    id="ds-fd-frame-nav-label"
                  >
                    {currentFrameIndex + 1} / {play.frames.length}
                  </span>
                  <button
                    type="button"
                    className="ds-fd-tb-btn ds-fd-frame-nav-btn"
                    id="btn-next-frame"
                    onClick={nextFrame}
                    disabled={currentFrameIndex >= play.frames.length - 1}
                    aria-label="Next frame"
                  >
                    ›
                  </button>
                </div>
                <span className="ds-fd-tb-sep" aria-hidden="true" />
                <button
                  type="button"
                  className={`ds-fd-tb-btn${currentTool === "select" ? " active" : ""}`}
                  id="btn-fd-tb-edit"
                  onClick={() => setTool("select")}
                >
                  <span className="ds-fd-tb-icon" aria-hidden="true">
                    ✎
                  </span>
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  className={`ds-fd-tb-btn${currentTool === "offense" ? " active" : ""}`}
                  id="btn-fastplace"
                  title="Place offense players (P) — tap court for players 1–5, then tap for ball"
                  onClick={() => setTool("offense")}
                >
                  <span className="ds-fd-tb-label">FastPlace</span>
                </button>
                <button
                  type="button"
                  className="ds-fd-tb-btn"
                  id="btn-formation-sets"
                  title="Offensive formation presets"
                  onClick={() => setFormationOpen(true)}
                >
                  <span className="ds-fd-tb-label">Sets</span>
                </button>
                <button
                  type="button"
                  className="ds-fd-tb-btn"
                  id="btn-fastadd-five"
                  title="5-out spacing"
                  onClick={fastBuildFiveOut}
                >
                  <span className="ds-fd-tb-label">FastBuild</span>
                </button>
                <button
                  type="button"
                  className="ds-fd-tb-btn"
                  id="btn-add-frame"
                  onClick={addFrame}
                >
                  <span className="ds-fd-tb-label">Next Frame</span>
                </button>
                <button
                  type="button"
                  className="ds-fd-tb-btn"
                  id="btn-delete-frame"
                  title="Delete current frame"
                  disabled={play.frames.length <= 1}
                  onClick={async () => {
                    if (play.frames.length <= 1) return;
                    const ok = await appConfirm({
                      title: "Delete frame",
                      message: "Delete this frame?",
                      confirmLabel: "Delete",
                      danger: true,
                    });
                    if (ok) deleteFrame();
                  }}
                >
                  <span className="ds-fd-tb-label">Delete Frame</span>
                </button>
                <button
                  type="button"
                  className="ds-fd-tb-btn"
                  id="btn-clear-frame"
                  title="Clear lines and actions from current frame"
                  onClick={async () => {
                    const ok = await appConfirm({
                      title: "Clear frame",
                      message:
                        "Clear all players, lines, and actions from this frame?",
                      confirmLabel: "Clear",
                      danger: true,
                    });
                    if (ok) clearFrame();
                  }}
                >
                  <span className="ds-fd-tb-label">Clear Frame</span>
                </button>
                <button
                  type="button"
                  className="ds-fd-tb-btn"
                  id="btn-duplicate-frame-toolbar"
                  onClick={duplicateFrame}
                >
                  <span className="ds-fd-tb-label">Duplicate</span>
                </button>
              </div>
              <div
                className="ds-fd-court-toolbar ds-fd-court-toolbar-secondary"
                aria-label="Undo, whiteboard, and animation"
              >
                <button
                  type="button"
                  className="ds-fd-tb-btn"
                  id="btn-undo"
                  title="Undo"
                  disabled={undoStack.length === 0}
                  onClick={undo}
                >
                  <span className="ds-fd-tb-icon" aria-hidden="true">
                    ↶
                  </span>
                </button>
                <button
                  type="button"
                  className="ds-fd-tb-btn"
                  id="btn-redo"
                  title="Redo"
                  disabled={redoStack.length === 0}
                  onClick={redo}
                >
                  <span className="ds-fd-tb-icon" aria-hidden="true">
                    ↷
                  </span>
                </button>
                <CourtWhiteboardToolbar
                  inline
                  onAnimate={() => setSidebarTab("anim")}
                />
              </div>
              </div>
            </div>
          </div>
        </main>

        <aside className="ds-fd-notes-panel" aria-label="Frame description">
          <div className="ds-fd-notes-head">
            <div className="ds-fd-notes-head-main">
              <input
                ref={frameHeadingRef}
                type="text"
                className="ds-fd-frame-heading-input"
                id="ds-fd-frame-heading"
                value={currentFrame?.name ?? ""}
                onChange={(e) => setFrameName(e.target.value)}
                maxLength={80}
                spellCheck={false}
                aria-label="Frame name"
                title="Click to rename this frame"
              />
            </div>
            <button
              type="button"
              className="ds-fd-notes-edit-btn"
              id="ds-fd-frame-edit-btn"
              title="Edit frame"
              aria-label="Edit frame"
              onClick={() => {
                frameHeadingRef.current?.focus();
                frameHeadingRef.current?.select();
              }}
            >
              ✎
            </button>
          </div>
          <div className="ds-editor-stack ds-notes-collapsible" id="ds-notes-collapsible">
            <div className="ds-notes-collapse-body" id="ds-notes-collapse-body">
              <div className="notes-rich-editor">
                <NotesFormatToolbar
                  editorRef={notesRef}
                  onChange={() => {
                    if (notesRef.current) {
                      setFrameNotes(notesRef.current.innerHTML);
                    }
                  }}
                />
                <div
                  ref={notesRef}
                  className="notes-editor notes-editor-main notes-editor-rich"
                  id="editor"
                  contentEditable
                  role="textbox"
                  aria-multiline="true"
                  data-placeholder="Enter description..."
                  suppressContentEditableWarning
                  onInput={(e) => setFrameNotes(e.currentTarget.innerHTML)}
                  onBlur={(e) => setFrameNotes(e.currentTarget.innerHTML)}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData("text/plain");
                    document.execCommand("insertText", false, text);
                    setFrameNotes(notesRef.current?.innerHTML ?? "");
                  }}
                />
              </div>
            </div>
          </div>
        </aside>

        <aside className="ds-sidebar-panel" aria-label="Frames and settings">
          <div className="ds-sidebar-tabs" role="tablist">
            <button
              type="button"
              className={`ds-sidebar-tab${sidebarTab === "frames" ? " active" : ""}`}
              data-tab="frames"
              role="tab"
              aria-selected={sidebarTab === "frames"}
              onClick={() => setSidebarTab("frames")}
            >
              Frames
            </button>
            <button
              type="button"
              className={`ds-sidebar-tab${sidebarTab === "anim" ? " active" : ""}`}
              data-tab="anim"
              role="tab"
              aria-selected={sidebarTab === "anim"}
              onClick={() => setSidebarTab("anim")}
            >
              Animation
            </button>
          </div>
          {sidebarTab === "frames" ? (
            <div
              className="ds-sidebar-tab-pane is-active"
              id="sidebar-tab-frames"
              role="tabpanel"
            >
              <div className="ds-thumb-list-vertical" id="frames-container">
                {play.frames.map((frame, index) => {
                  const active = index === currentFrameIndex;
                  return (
                    <div
                      key={frame.id}
                      role="button"
                      tabIndex={0}
                      className={`ds-thumb-item${active ? " active" : ""}`}
                      onClick={() => selectFrame(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectFrame(index);
                        }
                      }}
                    >
                      <div className="ds-thumb-frame-label">
                        {frame.name || `Frame ${index + 1}`}
                      </div>
                      <div className="ds-thumb-court">
                        <CourtFrameThumbnail
                          courtType={play.courtType}
                          frame={frame}
                          size="lg"
                          alt={frame.name}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div
              className="ds-sidebar-tab-pane is-active"
              id="sidebar-tab-anim"
              role="tabpanel"
            >
              <ActionSequencePanel />
            </div>
          )}
        </aside>
      </div>

      <LineTypeModal />
      <FormationModal
        open={formationOpen}
        onClose={() => setFormationOpen(false)}
        onSelect={(key: FormationKey) => applyFormation(key)}
      />
      <PlayDetailsModal
        open={detailsOpen}
        mode="edit"
        initial={{
          type: storedMeta?.type ?? "play",
          title: play.title,
          team: storedMeta?.team,
          series: storedMeta?.series,
          tags: storedMeta?.tags,
          courtType: play.courtType,
          season: storedMeta?.season,
          playNotes: storedMeta?.playNotes,
          videoUrl: storedMeta?.videoUrl,
        }}
        onClose={() => setDetailsOpen(false)}
        onSubmit={handleDetailsSubmit}
      />
      <DesignerShortcutsModal
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
      <input
        ref={importPlayInputRef}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleImportPlayFile(file);
        }}
      />
      {presentPlay ? (
        <PresentationOverlay
          play={presentPlay}
          onClose={() => setPresentPlay(null)}
        />
      ) : null}
      {printPlay ? (
        <LibraryPrintOverlay play={printPlay} onClose={() => setPrintPlay(null)} />
      ) : null}
      <ImportFrameModal
        open={importFrameOpen}
        items={libraryItems}
        getPlayDocument={getPlayDocument}
        onClose={() => setImportFrameOpen(false)}
        onImport={(frame) => replaceCurrentFrame(frame)}
      />

      <footer className="fd-app-footer">
        <span className="fd-app-footer-build">{APP_BUILD}</span>
      </footer>
    </div>
  );
}
