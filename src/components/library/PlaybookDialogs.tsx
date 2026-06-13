"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useModalA11y } from "@/hooks/useModalA11y";

function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

interface NameDialogProps {
  open: boolean;
  mode: "create" | "rename";
  initialName?: string;
  initialTeam?: string;
  teams: string[];
  existingNames: string[];
  onClose: () => void;
  onSubmit: (name: string, team: string) => void | Promise<void>;
}

export function PlaybookNameDialog({
  open,
  mode,
  initialName = "",
  initialTeam = "",
  teams,
  existingNames,
  onClose,
  onSubmit,
}: NameDialogProps) {
  const mounted = useMounted();
  const nameRef = useRef<HTMLInputElement>(null);
  const { panelRef, titleId, fieldId } = useModalA11y(open, onClose);
  const nameFieldId = `${fieldId}-name`;
  const teamFieldId = `${fieldId}-team`;
  const [name, setName] = useState(initialName);
  const [team, setTeam] = useState(initialTeam);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setTeam(initialTeam || teams[0] || "No Team");
    setError("");
    setSubmitting(false);
    const t = window.setTimeout(() => nameRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open, initialName, initialTeam, teams]);

  if (!open || !mounted) return null;

  const title = mode === "create" ? "Create playbook" : "Rename playbook";
  const submitLabel = mode === "create" ? "Create" : "Save";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter a playbook name.");
      return;
    }
    if (
      mode === "rename" &&
      trimmed.toLowerCase() === initialName.trim().toLowerCase()
    ) {
      onClose();
      return;
    }
    const duplicate = existingNames.some(
      (existing) => existing.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      setError("A playbook with this name already exists.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(trimmed, team);
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="modal-overlay active fc-playbook-dialog-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="modal-box modal-box-wide fc-playbook-dialog-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="modal-title" id={titleId}>
            {title}
          </div>
          <p className="modal-subtitle">
            {mode === "create"
              ? "Give your playbook a name and team."
              : "Update the playbook name."}
          </p>
          <div className="modal-field fc-playbook-dialog-field">
            <label htmlFor={nameFieldId}>
              <span className="fc-playbook-dialog-label">Name</span>
              <input
                ref={nameRef}
                id={nameFieldId}
                type="text"
                value={name}
                placeholder="e.g. Offense 2026"
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError("");
                }}
              />
            </label>
          </div>
          {mode === "create" ? (
            <div className="modal-field fc-playbook-dialog-field">
              <label htmlFor={teamFieldId}>
                <span className="fc-playbook-dialog-label">Team</span>
                <select
                  id={teamFieldId}
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                >
                  {(teams.length ? teams : ["No Team"]).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
          {error ? (
            <p className="fc-playbook-dialog-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="modal-actions">
            <button
              type="button"
              className="modal-cancel"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button type="submit" className="modal-create" disabled={submitting}>
              {submitting ? "…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

interface DeleteDialogProps {
  open: boolean;
  playbookName: string;
  playCount: number;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function PlaybookDeleteDialog({
  open,
  playbookName,
  playCount,
  onClose,
  onConfirm,
}: DeleteDialogProps) {
  const mounted = useMounted();
  const { panelRef, titleId } = useModalA11y(open, onClose);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) setSubmitting(false);
  }, [open]);

  if (!open || !mounted) return null;

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="modal-overlay active fc-playbook-dialog-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="modal-box modal-box-wide fc-playbook-dialog-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title" id={titleId}>
          Delete playbook
        </div>
        <p className="modal-subtitle fc-playbook-delete-message">
          Delete &ldquo;{playbookName}&rdquo;?
          {playCount > 0
            ? ` This playbook contains ${playCount} play${playCount === 1 ? "" : "s"}.`
            : ""}{" "}
          This cannot be undone.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="modal-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal-create fc-playbook-dialog-danger"
            disabled={submitting}
            onClick={() => void handleConfirm()}
          >
            {submitting ? "…" : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface RemovePlayDialogProps {
  open: boolean;
  playTitle: string;
  playbookName: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function PlaybookRemovePlayDialog({
  open,
  playTitle,
  playbookName,
  onClose,
  onConfirm,
}: RemovePlayDialogProps) {
  const mounted = useMounted();
  const { panelRef, titleId } = useModalA11y(open, onClose);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) setSubmitting(false);
  }, [open]);

  if (!open || !mounted) return null;

  async function handleConfirm() {
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="modal-overlay active fc-playbook-dialog-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="modal-box modal-box-wide fc-playbook-dialog-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title" id={titleId}>
          Remove from playbook
        </div>
        <p className="modal-subtitle fc-playbook-delete-message">
          Remove &ldquo;{playTitle}&rdquo; from &ldquo;{playbookName}&rdquo;?
          The play stays in your library.
        </p>
        <div className="modal-actions">
          <button
            type="button"
            className="modal-cancel"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="modal-create fc-playbook-dialog-danger"
            disabled={submitting}
            onClick={() => void handleConfirm()}
          >
            {submitting ? "…" : "Remove"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface NoticeDialogProps {
  open: boolean;
  title: string;
  message: string;
  onClose: () => void;
}

export function PlaybookNoticeDialog({
  open,
  title,
  message,
  onClose,
}: NoticeDialogProps) {
  const mounted = useMounted();
  const { panelRef, titleId } = useModalA11y(open, onClose);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="modal-overlay active fc-playbook-dialog-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="modal-box modal-box-wide fc-playbook-dialog-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title" id={titleId}>
          {title}
        </div>
        <p className="modal-subtitle">{message}</p>
        <div className="modal-actions">
          <button type="button" className="modal-create" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
