"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { LINE_ACTION_CHOICES } from "@/lib/designer/action-constants";
import { APP_BUILD } from "@/lib/config";
import { useAppLogoSrc } from "@/hooks/useAppLogoSrc";
import { useFrameAnimationPlayback } from "@/hooks/useFrameAnimationPlayback";
import { blankStoredPlay } from "@/lib/library/convert";
import { serializeDesignerDocument } from "@/lib/designer/designer-document-snapshot";
import { useDesignerUnsavedGuard } from "@/lib/designer/use-designer-unsaved-guard";
import { CourtFrameThumbnail } from "@/components/designer/CourtFrameThumbnail";
import { framesForDesignerThumbnails } from "@/lib/designer/thumbnail-objects";
import { blockNativeContextMenu } from "@/lib/ui/context-menu-policy";
import { ActionSequencePanel } from "@/components/designer/ActionSequencePanel";
import { ActionTimeline } from "@/components/designer/ActionTimeline";
import { CourtAnimationPlaybackBar } from "@/components/designer/CourtAnimationPlaybackBar";
import { CourtWhiteboardToolbar } from "@/components/designer/CourtWhiteboardToolbar";
import { NotesFormatToolbar } from "@/components/designer/NotesFormatToolbar";
import { LineColorControl } from "@/components/designer/LineColorControl";
import { ConeToolIcon } from "@/components/designer/ConeMarker";
import { DesignerToolIcon } from "@/components/designer/DesignerToolIcon";
import { LineTypeBar } from "@/components/designer/LineTypeBar";
import { ShadowTypeBar } from "@/components/designer/ShadowTypeBar";
import { ImportFrameModal } from "@/components/designer/ImportFrameModal";
import {
  PlayDetailsModal,
  type PlayDetailsValues,
} from "@/components/library/PlayDetailsModal";
import { DesignerShortcutsModal } from "@/components/designer/DesignerShortcutsModal";
import { DesignerCourtSettingsMenu } from "@/components/designer/DesignerCourtSettingsMenu";
import { LibraryPrintOverlay } from "@/components/library/LibraryPrintOverlay";
import { downloadBlob, downloadDataUrl, sanitizeExportFilename } from "@/lib/designer/download";
import {
  AnimationExportAborted,
  exportPlayAnimationMp4,
  canExportPlayAnimationMp4,
  playHasExportableAnimation,
  waitForPaint,
} from "@/lib/designer/animation-export";
import type { CourtCanvasHandle } from "@/components/designer/CourtCanvas";
import { UserMenu } from "@/components/shell/UserMenu";
import { useLibraryStore } from "@/stores/library-store";
import { useAuthStore } from "@/stores/auth-store";
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

const SIDEBAR_COMPACT_KEY = "fc-designer-sidebar-compact";

const TOOL_GROUPS: Array<{
  label: string;
  tools: Array<{ id: DesignerTool; name: string; shortcut?: string }>;
}> = [
  {
    label: "Positions",
    tools: [
      { id: "offense", name: "Offense", shortcut: "O / P" },
      { id: "defense", name: "Defense", shortcut: "X" },
      { id: "delete", name: "Delete", shortcut: "" },
    ],
  },
  {
    label: "Actions",
    tools: [
      { id: "line", name: "Line", shortcut: "L / F" },
    ],
  },
  {
    label: "Miscellaneous",
    tools: [
      { id: "text", name: "Text", shortcut: "" },
      { id: "cone", name: "Cone", shortcut: "" },
      { id: "flag", name: "Flag", shortcut: "" },
      { id: "shadow", name: "Shadows", shortcut: "" },
      { id: "zone", name: "Zone", shortcut: "" },
    ],
  },
];

function toolGroupLabelForTool(
  tool: DesignerTool,
  groups: typeof TOOL_GROUPS = TOOL_GROUPS,
): (typeof TOOL_GROUPS)[number]["label"] {
  for (const group of groups) {
    if (group.tools.some((item) => item.id === tool)) return group.label;
  }
  return "Positions";
}

function drillToolGroups(): typeof TOOL_GROUPS {
  return TOOL_GROUPS.map((group) =>
    group.label === "Positions"
      ? {
          ...group,
          tools: [
            group.tools[0]!,
            group.tools[1]!,
            { id: "ball" as const, name: "Ball", shortcut: "B" },
            ...group.tools.slice(2),
          ],
        }
      : group,
  );
}

function defaultOpenToolGroups(): Set<string> {
  return new Set(TOOL_GROUPS.map((group) => group.label));
}

export function DesignerScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get("item");
  const initialPanel = searchParams.get("panel");
  const getPlayDocument = useLibraryStore((s) => s.getPlayDocument);
  const savePlayDocument = useLibraryStore((s) => s.savePlayDocument);
  const libraryItems = useLibraryStore((s) => s.items);
  const session = useAuthStore((s) => s.session);
  const loadMeta = useOrganizerStore((s) => s.loadMeta);
  const metaHydrated = useOrganizerStore((s) => s.hydrated);
  const loadPlay = useDesignerStore((s) => s.loadPlay);
  const play = useDesignerStore((s) => s.play);
  const libraryItemType = useDesignerStore((s) => s.libraryItemType);
  const setLibraryItemType = useDesignerStore((s) => s.setLibraryItemType);
  const setTool = useDesignerStore((s) => s.setTool);
  const currentTool = useDesignerStore((s) => s.tool);
  const whiteboardInkMode = useDesignerStore((s) => s.whiteboardInkMode);
  const currentFrameIndex = useDesignerStore((s) => s.currentFrameIndex);
  const selectFrame = useDesignerStore((s) => s.selectFrame);
  const setFrameName = useDesignerStore((s) => s.setFrameName);
  const addFrame = useDesignerStore((s) => s.addFrame);
  const duplicateFrame = useDesignerStore((s) => s.duplicateFrame);
  const clearFrame = useDesignerStore((s) => s.clearFrame);
  const deleteFrame = useDesignerStore((s) => s.deleteFrame);
  const setTitle = useDesignerStore((s) => s.setTitle);
  const setCourtType = useDesignerStore((s) => s.setCourtType);
  const lineActionType = useDesignerStore((s) => s.lineActionType);
  const setLineActionType = useDesignerStore((s) => s.setLineActionType);
  const selectedActionId = useDesignerStore((s) => s.selectedActionId);
  const changeActionType = useDesignerStore((s) => s.changeActionType);
  const fastBuildFiveOut = useDesignerStore((s) => s.fastBuildFiveOut);
  const courtZoom = useDesignerStore((s) => s.courtZoom);
  const activeShadowType = useDesignerStore((s) => s.activeShadowType);
  const setShadowType = useDesignerStore((s) => s.setShadowType);
  const undo = useDesignerStore((s) => s.undo);
  const redo = useDesignerStore((s) => s.redo);
  const undoStack = useDesignerStore((s) => s.undoStack);
  const redoStack = useDesignerStore((s) => s.redoStack);
  const setFrameNotes = useDesignerStore((s) => s.setFrameNotes);
  const removeObject = useDesignerStore((s) => s.removeObject);
  const removeAction = useDesignerStore((s) => s.removeAction);
  const selectObject = useDesignerStore((s) => s.selectObject);
  const selectAction = useDesignerStore((s) => s.selectAction);
  const setAnimRuntime = useDesignerStore((s) => s.setAnimRuntime);
  const mirrorCurrentFrame = useDesignerStore((s) => s.mirrorCurrentFrame);
  const replaceCurrentFrame = useDesignerStore((s) => s.replaceCurrentFrame);
  const animationPlayback = useFrameAnimationPlayback();

  const isDrill = libraryItemType === "drill";
  const toolGroups = useMemo(
    () => (isDrill ? drillToolGroups() : TOOL_GROUPS),
    [isDrill],
  );

  const [storedMeta, setStoredMeta] = useState<StoredPlay | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [printPlay, setPrintPlay] = useState<StoredPlay | null>(null);
  const [importFrameOpen, setImportFrameOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"frames" | "anim">(() =>
    initialPanel === "anim" ? "anim" : "frames",
  );
  const [sidebarCompact, setSidebarCompact] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COMPACT_KEY) === "1";
    } catch {
      return false;
    }
  });
  const notesRef = useRef<HTMLDivElement>(null);
  const notesFrameId = useRef<string | null>(null);
  const frameHeadingRef = useRef<HTMLInputElement>(null);
  const courtRef = useRef<CourtCanvasHandle>(null);
  const designerRootRef = useRef<HTMLDivElement>(null);
  const exportAnimAbortRef = useRef<AbortController | null>(null);
  const savedSnapshotRef = useRef<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const loadedDocumentKeyRef = useRef<string | null>(null);
  const [exportingAnim, setExportingAnim] = useState(false);
  const [exportAnimProgress, setExportAnimProgress] = useState(0);
  const [openToolGroups, setOpenToolGroups] = useState<Set<string>>(defaultOpenToolGroups);

  useEffect(() => {
    if (storedMeta?.type) {
      setLibraryItemType(storedMeta.type);
    }
  }, [storedMeta?.type, setLibraryItemType]);

  useEffect(() => {
    if (isDrill || currentTool !== "ball") return;
    setTool("offense");
  }, [isDrill, currentTool, setTool]);

  const applySettings = useSettingsStore((s) => s.applyAll);
  const settingsHydrated = useSettingsStore((s) => s.hydrated);
  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const appLogoSrc = useAppLogoSrc();

  const currentFrame = play.frames[currentFrameIndex];
  const selectedAction = currentFrame?.actions.find(
    (a) => a.id === selectedActionId,
  );
  const showLineTypeBar =
    currentTool === "line" || (currentTool === "select" && !!selectedAction);
  const showActionTimelineDock =
    showLineTypeBar || (currentFrame?.actions.length ?? 0) > 0;
  const thumbnailFrames = useMemo(
    () => framesForDesignerThumbnails(play.frames),
    [play.frames],
  );

  useEffect(() => {
    if (!settingsHydrated) hydrateSettings();
  }, [settingsHydrated, hydrateSettings]);

  function toggleSidebarCompact() {
    setSidebarCompact((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COMPACT_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  useEffect(() => {
    const group = toolGroupLabelForTool(currentTool, toolGroups);
    setOpenToolGroups((prev) => {
      if (prev.has(group)) return prev;
      const next = new Set(prev);
      next.add(group);
      return next;
    });
  }, [currentTool, toolGroups]);

  useEffect(() => {
    setOpenToolGroups(defaultOpenToolGroups());
  }, [play.id]);

  useEffect(() => {
    if (!settingsHydrated) return;
    applySettings();
  }, [settingsHydrated, applySettings]);

  useEffect(() => {
    if (!metaHydrated && session?.user) void loadMeta();
  }, [metaHydrated, loadMeta, session?.user?.id]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node | null;
      const wrap = document.getElementById("btn-play-overflow")?.closest(
        ".ds-fd-overflow-wrap",
      );
      if (wrap?.contains(target)) return;
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
      if (key === "b") {
        const mode = useDesignerStore.getState().libraryItemType;
        if (mode === "drill") setTool("ball");
      }
      if (key === "l" || key === "f" || key === "d") setTool("line");
      if (key === "s") {
        setTool("line");
        setLineActionType("shoot");
      }
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
    let active = true;

    async function bootstrap() {
      setLoading(true);
      try {
        if (itemId) {
          const stored = await getPlayDocument(itemId);
          if (!active) return;
          if (stored) {
            setStoredMeta(stored);
            loadPlay(
              {
                id: stored.id,
                title: stored.title,
                courtType: stored.courtType,
                courtView: stored.courtView,
                frames: stored.frames,
                animSpeed: stored.animSpeed,
                animPauseMs: stored.animPauseMs,
              },
              { libraryItemType: stored.type },
            );
            return;
          }
          appNotice(
            "Play not found",
            "This play is missing or could not be decoded. Re-import the file if needed.",
          );
          router.replace("/library");
          return;
        }

        const blank = blankStoredPlay("Untitled play");
        if (!active) return;
        setStoredMeta(blank);
        loadPlay(blank, { libraryItemType: blank.type });
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [itemId, getPlayDocument, loadPlay, router]);

  function buildStoredPlaySnapshot(metaPatch?: Partial<StoredPlay>): StoredPlay {
    const notesHtml = notesRef.current?.innerHTML ?? "";
    const framesWithNotes = play.frames.map((frame, index) =>
      index === currentFrameIndex ? { ...frame, notes: notesHtml } : frame,
    );
    const now = new Date().toISOString();
    return {
      id: play.id,
      title: play.title,
      courtType: play.courtType,
      courtView: play.courtView,
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
  }

  const markDocumentSaved = useCallback((doc: StoredPlay) => {
    const serialized = serializeDesignerDocument(doc);
    savedSnapshotRef.current = serialized;
    setSavedSnapshot(serialized);
  }, []);

  useEffect(() => {
    if (loading || savedSnapshot === null) {
      setIsDirty(false);
      return;
    }
    setIsDirty(
      serializeDesignerDocument(buildStoredPlaySnapshot()) !== savedSnapshot,
    );
  }, [loading, play, storedMeta, currentFrameIndex, savedSnapshot]);

  useDesignerUnsavedGuard(isDirty, !loading);

  useEffect(() => {
    if (loading) return;
    const documentKey = itemId ?? `blank-${play.id}`;
    if (
      loadedDocumentKeyRef.current === documentKey &&
      savedSnapshotRef.current !== null
    ) {
      return;
    }
    loadedDocumentKeyRef.current = documentKey;
    markDocumentSaved(buildStoredPlaySnapshot());
  }, [loading, itemId, play.id, markDocumentSaved]);

  async function handleSave(metaPatch?: Partial<StoredPlay>) {
    const notesHtml = notesRef.current?.innerHTML ?? "";
    if (notesRef.current) {
      setFrameNotes(notesHtml);
    }
    setSaving(true);
    try {
      const doc = buildStoredPlaySnapshot(metaPatch);
      await savePlayDocument(doc);
      setStoredMeta(doc);
      markDocumentSaved(doc);
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
      courtView: values.courtView,
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
    loadPlay(
      {
        id: doc.id,
        title: doc.title,
        courtType: doc.courtType,
        courtView: doc.courtView,
        frames: doc.frames,
        animSpeed: doc.animSpeed,
        animPauseMs: doc.animPauseMs,
      },
      { libraryItemType: doc.type },
    );
    setDetailsOpen(false);
  }

  async function getCurrentStoredPlay(): Promise<StoredPlay> {
    return handleSave();
  }

  function handlePrint() {
    setMenuOpen(false);
    setPrintPlay(buildStoredPlaySnapshot());
    void handleSave();
  }

  async function handleShareLink() {
    setMenuOpen(false);
    const doc = await getCurrentStoredPlay();
    const { buildSmartPlayUrl, copyShareResult } = await import("@/lib/share/share-link");
    const result = buildSmartPlayUrl(doc, { playerView: false });
    await copyShareResult(result, doc.title);
  }

  function toggleToolGroup(label: string) {
    setOpenToolGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
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

  function handleCancelAnimationExport() {
    exportAnimAbortRef.current?.abort();
  }

  async function handleExportAnimationMp4() {
    setMenuOpen(false);
    if (!canExportPlayAnimationMp4()) {
      appNotice(
        "Export not supported",
        "This browser cannot encode MP4 video. Try Chrome or Edge.",
      );
      return;
    }

    if (!playHasExportableAnimation(play)) {
      appNotice(
        "Nothing to export",
        "Add at least one action to a frame before exporting animation.",
      );
      return;
    }

    const startFrameIndex = currentFrameIndex;
    const abort = new AbortController();
    exportAnimAbortRef.current = abort;
    setExportingAnim(true);
    setExportAnimProgress(0);
    selectAction(null);

    try {
      const blob = await exportPlayAnimationMp4({
        play,
        fps: 30,
        signal: abort.signal,
        onProgress: setExportAnimProgress,
        applySample: async (sample) => {
          flushSync(() => {
            selectFrame(sample.frameIndex);
            setAnimRuntime(sample.runtime);
          });
          await waitForPaint();
        },
        captureToTarget: (target) => courtRef.current?.blitToCanvas(target) ?? false,
      });

      const filename = `${sanitizeExportFilename(play.title)}_animation.mp4`;
      downloadBlob(blob, filename);
      appNotice("Export complete", `Saved ${filename}`);
    } catch (error) {
      if (error instanceof AnimationExportAborted) {
        appNotice("Export cancelled", "Animation export was stopped.");
        return;
      }
      appNotice(
        "Export failed",
        error instanceof Error ? error.message : "Could not export animation.",
      );
    } finally {
      setAnimRuntime(null);
      selectFrame(startFrameIndex);
      selectAction(null);
      setExportingAnim(false);
      setExportAnimProgress(0);
      exportAnimAbortRef.current = null;
    }
  }

  async function handleDownloadPlay() {
    setMenuOpen(false);
    const doc = await getCurrentStoredPlay();
    if (!doc) return;
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: "application/json",
    });
    downloadBlob(blob, `${sanitizeExportFilename(doc.title)}.json`);
  }

  async function handleCreateEmbedCode() {
    setMenuOpen(false);
    const doc = await getCurrentStoredPlay();
    if (!doc) return;
    const { buildSmartPlayUrl } = await import("@/lib/share/share-link");
    const result = buildSmartPlayUrl(doc, { playerView: false });
    if (!result.ok || !result.url) {
      appNotice(
        "Embed unavailable",
        "This play is too large for an embed link. Try Download instead.",
      );
      return;
    }
    const embed = `<iframe src="${result.url}" width="900" height="519" frameborder="0" allowfullscreen title="${doc.title.replace(/"/g, "&quot;")}"></iframe>`;
    try {
      await navigator.clipboard.writeText(embed);
      appNotice("Embed code copied", "Paste the iframe code on your site.");
    } catch {
      appNotice("Copy failed", "Could not copy embed code to clipboard.");
    }
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
      className={`fd-play-editor-pane fd-ui designer-route active${currentTool === "whiteboard" ? " designer-whiteboard-active" : ""}${currentTool === "whiteboard" && whiteboardInkMode === "erase" ? " designer-whiteboard-erase" : ""}${sidebarCompact ? " sidebar-compact" : ""}`}
    >
      <header className="ds-fd-header">
        <div className="ds-fd-app-bar">
          <div className="ds-fd-app-bar-left">
            <img
              src={appLogoSrc}
              alt=""
              className="ds-fd-app-logo"
              data-custom-brand="1"
            />
          </div>
          <div className="ds-fd-app-bar-center">EDITOR</div>
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
            <div className="ds-fd-overflow-wrap">
              <button
                type="button"
                className="ds-fd-icon-btn"
                id="btn-play-overflow"
                title="Court settings"
                aria-label="Court settings"
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
              >
                ⋯
              </button>
              <DesignerCourtSettingsMenu
                open={menuOpen}
                exportHandlers={{
                  exportingAnim,
                  onShareLink: () => void handleShareLink(),
                  onExportVideo: () => void handleExportAnimationMp4(),
                  onExportImages: () => void handleExportAllFramesPng(),
                  onEmbedCode: () => void handleCreateEmbedCode(),
                  onDownload: () => void handleDownloadPlay(),
                  onPrint: handlePrint,
                }}
              />
            </div>
            {isDirty ? (
              <span className="ds-unsaved-hint" id="designer-unsaved-hint">
                Unsaved changes
              </span>
            ) : null}
            <button
              type="button"
              className="ds-fd-done-btn fd-ds-back"
              id="btn-back"
              disabled={saving}
              onClick={() => void handleDone()}
            >
              Done
            </button>
          </div>
        </div>
      </header>

      {exportingAnim ? (
        <div className="ds-export-overlay" role="status" aria-live="polite">
          <span className="ds-export-overlay-label">
            Exporting MP4… {Math.round(exportAnimProgress * 100)}%
          </span>
          <div
            className="ds-export-overlay-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(exportAnimProgress * 100)}
          >
            <span
              className="ds-export-overlay-progress-fill"
              style={{ width: `${Math.round(exportAnimProgress * 100)}%` }}
            />
          </div>
          <button
            type="button"
            className="ds-export-overlay-cancel"
            onClick={handleCancelAnimationExport}
          >
            Cancel
          </button>
        </div>
      ) : null}

      <div className="ds-body">
        <aside className={`ds-left-panel${sidebarCompact ? " is-compact" : ""}`}>
          <div className="ds-panel-section">
            <div className="ds-panel-heading ds-panel-heading-tools">
              {!sidebarCompact ? <span>Tools</span> : null}
              <button
                type="button"
                className="ds-sidebar-compact-toggle"
                title={sidebarCompact ? "Expand sidebar" : "Compact sidebar"}
                aria-label={sidebarCompact ? "Expand sidebar" : "Compact sidebar"}
                aria-pressed={sidebarCompact}
                onClick={toggleSidebarCompact}
              >
                {sidebarCompact ? "»" : "«"}
              </button>
            </div>
            <div className="ds-tool-list" id="ds-tool-list">
              {toolGroups.map((group) => {
                const isOpen = openToolGroups.has(group.label);
                return (
                <div
                  key={group.label}
                  className={`ds-tool-group${isOpen ? " open" : ""}`}
                  data-tool-group={group.label.toLowerCase()}
                >
                  <button
                    type="button"
                    className="ds-tool-group-toggle"
                    aria-expanded={isOpen}
                    onClick={() => toggleToolGroup(group.label)}
                  >
                    <span className="ds-tool-group-label">{group.label}</span>
                    <span className="ds-tool-group-chevron" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  <div className="ds-tool-group-menu">
                    {group.tools.map((t) => (
                      <div key={t.id}>
                        <button
                          type="button"
                          className={`ds-tool-item${currentTool === t.id ? " active" : ""}`}
                          data-tool={t.id}
                          title={sidebarCompact ? t.name : undefined}
                          onClick={() => setTool(t.id)}
                        >
                          <span className="ds-tool-icon">
                            {t.id === "cone" ? (
                              <ConeToolIcon size={28} />
                            ) : (
                              <DesignerToolIcon tool={t.id} size={28} />
                            )}
                          </span>
                          <span className="ds-tool-name">{t.name}</span>
                        </button>
                        {t.id === "shadow" && currentTool === "shadow" ? (
                          <ShadowTypeBar
                            value={activeShadowType}
                            onChange={setShadowType}
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
                );
              })}
            </div>
          </div>
          <LineColorControl />
        </aside>

        <main className="ds-canvas-area">
          <div className="ds-center-stack">
            <div className="ds-court-block">
              <div className="ds-court-preview-card">
                <div className="ds-court-stage">
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
                </div>
                <CourtAnimationPlaybackBar
                  playback={animationPlayback}
                  disabled={!playHasExportableAnimation(play)}
                />
              </div>
              <div className="ds-fd-court-toolbar-stack">
              <div className="ds-fd-court-toolbar" aria-label="Court tools">
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
                <CourtWhiteboardToolbar inline />
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
              <div
                className="notes-rich-editor"
                onContextMenu={blockNativeContextMenu}
              >
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
                  onContextMenu={blockNativeContextMenu}
                  onInput={(e) => setFrameNotes(e.currentTarget.innerHTML)}
                  onBlur={(e) => setFrameNotes(e.currentTarget.innerHTML)}
                  onPaste={(e) => {
                    e.preventDefault();
                    const text = e.clipboardData.getData("text/plain");
                    document.execCommand("insertText", false, text);
                    setFrameNotes(notesRef.current?.innerHTML ?? "");
                  }}
                />
                {showActionTimelineDock ? (
                  <>
                    <div
                      className={`ds-notes-line-options-dock${showLineTypeBar ? "" : " is-slot-reserved"}`}
                      aria-label="Line options"
                      aria-hidden={!showLineTypeBar}
                    >
                      <LineTypeBar
                        value={
                          currentTool === "select" && selectedAction
                            ? selectedAction.type
                            : lineActionType
                        }
                        onChange={(type) => {
                          if (currentTool === "select" && selectedActionId) {
                            changeActionType(selectedActionId, type);
                            return;
                          }
                          setLineActionType(type);
                        }}
                      />
                    </div>
                    <div className="ds-notes-phase-dock" aria-label="Frame animation">
                      <ActionTimeline variant="dock" />
                    </div>
                  </>
                ) : null}
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
                {thumbnailFrames.map((frame, index) => {
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
                          courtView={play.courtView}
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
              <ActionSequencePanel
                playback={animationPlayback}
                exportingAnim={exportingAnim}
                canExportMp4={canExportPlayAnimationMp4()}
                onExportMp4={() => void handleExportAnimationMp4()}
              />
            </div>
          )}
        </aside>
      </div>
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
          courtView: play.courtView,
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
