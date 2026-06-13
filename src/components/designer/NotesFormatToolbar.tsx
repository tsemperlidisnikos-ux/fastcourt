"use client";

import type { RefObject } from "react";

interface Props {
  editorRef: RefObject<HTMLDivElement | null>;
  onChange?: () => void;
}

export function NotesFormatToolbar({ editorRef, onChange }: Props) {
  function focusEditor() {
    editorRef.current?.focus();
  }

  function runCommand(cmd: string) {
    focusEditor();
    document.execCommand(cmd, false);
    onChange?.();
  }

  function applyColor(color: string) {
    focusEditor();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand("foreColor", false, color);
    onChange?.();
  }

  return (
    <div
      className="notes-format-toolbar"
      id="notes-format-toolbar"
      role="toolbar"
      aria-label="Frame notes formatting"
      onMouseDown={(e) => {
        if (e.target instanceof HTMLInputElement) return;
        e.preventDefault();
      }}
    >
      <button
        type="button"
        className="notes-fmt-btn"
        data-cmd="bold"
        title="Bold"
        onClick={() => runCommand("bold")}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        className="notes-fmt-btn"
        data-cmd="italic"
        title="Italic"
        onClick={() => runCommand("italic")}
      >
        <em>I</em>
      </button>
      <button
        type="button"
        className="notes-fmt-btn"
        data-cmd="underline"
        title="Underline"
        onClick={() => runCommand("underline")}
      >
        <span className="notes-fmt-u">U</span>
      </button>
      <label className="notes-fmt-color-wrap" title="Text color">
        <span className="notes-fmt-color-icon" aria-hidden="true">
          🎨
        </span>
        <input
          type="color"
          className="notes-fmt-color"
          id="notes-fmt-color"
          defaultValue="#1e293b"
          onInput={(e) => applyColor(e.currentTarget.value)}
        />
      </label>
      <span className="notes-fmt-sep" aria-hidden="true" />
      <button
        type="button"
        className="notes-fmt-btn notes-fmt-align"
        data-cmd="justifyLeft"
        title="Align left"
        onClick={() => runCommand("justifyLeft")}
      >
        <span className="notes-fmt-align-icon align-left" />
      </button>
      <button
        type="button"
        className="notes-fmt-btn notes-fmt-align"
        data-cmd="justifyCenter"
        title="Align center"
        onClick={() => runCommand("justifyCenter")}
      >
        <span className="notes-fmt-align-icon align-center" />
      </button>
      <button
        type="button"
        className="notes-fmt-btn notes-fmt-align"
        data-cmd="justifyRight"
        title="Align right"
        onClick={() => runCommand("justifyRight")}
      >
        <span className="notes-fmt-align-icon align-right" />
      </button>
      <button
        type="button"
        className="notes-fmt-btn notes-fmt-align"
        data-cmd="justifyFull"
        title="Justify"
        onClick={() => runCommand("justifyFull")}
      >
        <span className="notes-fmt-align-icon align-justify" />
      </button>
      <span className="notes-fmt-sep" aria-hidden="true" />
      <button
        type="button"
        className="notes-fmt-btn"
        data-cmd="insertUnorderedList"
        title="Bullet list"
        onClick={() => runCommand("insertUnorderedList")}
      >
        <span className="notes-fmt-list-icon">•≡</span>
      </button>
      <button
        type="button"
        className="notes-fmt-btn"
        data-cmd="insertOrderedList"
        title="Numbered list"
        onClick={() => runCommand("insertOrderedList")}
      >
        <span className="notes-fmt-list-icon">1.</span>
      </button>
    </div>
  );
}
