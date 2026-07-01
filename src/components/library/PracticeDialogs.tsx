"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { useClientMounted } from "@/hooks/useClientMounted";
import { useModalA11y } from "@/hooks/useModalA11y";

interface InputDialogProps {
  open: boolean;
  title: string;
  subtitle?: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  submitLabel?: string;
  allowEmpty?: boolean;
  multiline?: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void | Promise<void>;
}

export function PracticeInputDialog(props: InputDialogProps) {
  const mounted = useClientMounted();
  if (!props.open || !mounted) return null;
  const dialogKey = `${props.title}:${props.initialValue ?? ""}`;
  return <PracticeInputDialogBody key={dialogKey} {...props} />;
}

function PracticeInputDialogBody({
  open,
  title,
  subtitle,
  label,
  initialValue = "",
  placeholder,
  submitLabel = "Save",
  allowEmpty = false,
  multiline = false,
  onClose,
  onSubmit,
}: InputDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { panelRef, titleId, fieldId } = useModalA11y(open, onClose);
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => {
      if (multiline) textareaRef.current?.focus();
      else inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [multiline]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed && !allowEmpty) {
      setError("Please enter a value.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
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
          {subtitle ? <p className="modal-subtitle">{subtitle}</p> : null}
          <div className="modal-field fc-playbook-dialog-field">
            <label htmlFor={fieldId}>
              <span className="fc-playbook-dialog-label">{label}</span>
              {multiline ? (
                <textarea
                  ref={textareaRef}
                  id={fieldId}
                  rows={6}
                  value={value}
                  placeholder={placeholder}
                  onChange={(e) => {
                    setValue(e.target.value);
                    if (error) setError("");
                  }}
                />
              ) : (
                <input
                  ref={inputRef}
                  id={fieldId}
                  type="text"
                  value={value}
                  placeholder={placeholder}
                  onChange={(e) => {
                    setValue(e.target.value);
                    if (error) setError("");
                  }}
                />
              )}
            </label>
          </div>
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

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function PracticeConfirmDialog(props: ConfirmDialogProps) {
  const mounted = useClientMounted();
  if (!props.open || !mounted) return null;
  return <PracticeConfirmDialogBody {...props} />;
}

function PracticeConfirmDialogBody({
  title,
  message,
  confirmLabel = "Confirm",
  danger = false,
  onClose,
  onConfirm,
}: ConfirmDialogProps) {
  const { panelRef, titleId } = useModalA11y(true, onClose);
  const [submitting, setSubmitting] = useState(false);

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
          {title}
        </div>
        {message ? <p className="modal-subtitle">{message}</p> : null}
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
            className={`modal-create${danger ? " fc-playbook-dialog-danger" : ""}`}
            disabled={submitting}
            onClick={() => void handleConfirm()}
          >
            {submitting ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
