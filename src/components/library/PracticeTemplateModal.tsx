"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useClientMounted } from "@/hooks/useClientMounted";
import {
  deleteCustomPracticeTemplate,
  getAllPracticeTemplates,
  renameCustomPracticeTemplate,
} from "@/lib/practice/templates";
import { appConfirm, appNotice, appPrompt } from "@/stores/dialog-store";
import type { PracticeTemplate } from "@/types/library-meta";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (template: PracticeTemplate) => void;
  onEdit?: (template: PracticeTemplate) => void;
}

export function PracticeTemplateModal({ open, onClose, onSelect, onEdit }: Props) {
  const mounted = useClientMounted();
  if (!open || !mounted) return null;
  return (
    <PracticeTemplateModalBody
      onClose={onClose}
      onSelect={onSelect}
      onEdit={onEdit}
    />
  );
}

function PracticeTemplateModalBody({
  onClose,
  onSelect,
  onEdit,
}: Pick<Props, "onClose" | "onSelect" | "onEdit">) {
  const [templates, setTemplates] = useState<PracticeTemplate[]>([]);

  async function refreshTemplates() {
    setTemplates(await getAllPracticeTemplates());
  }

  useEffect(() => {
    void refreshTemplates();
  }, []);

  async function handleDeleteTemplate(tpl: PracticeTemplate) {
    if (tpl.builtin) return;
    const confirmed = await appConfirm({
      title: "Delete template",
      message: `Delete "${tpl.name}"? This cannot be undone.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    await deleteCustomPracticeTemplate(tpl.id);
    await refreshTemplates();
  }

  async function handleRenameTemplate(tpl: PracticeTemplate) {
    if (tpl.builtin) return;
    const name = await appPrompt({
      title: "Rename template",
      subtitle: "Choose a new name for this saved template.",
      label: "Template name",
      initialValue: tpl.name,
      placeholder: "e.g. Monday offense template",
      submitLabel: "Save name",
    });
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      appNotice("Name required", "Enter a template name.");
      return;
    }
    const ok = await renameCustomPracticeTemplate(tpl.id, trimmed);
    if (!ok) {
      appNotice("Rename failed", "Could not rename this template.");
      return;
    }
    await refreshTemplates();
  }

  function handleEditTemplate(tpl: PracticeTemplate) {
    if (tpl.builtin || !onEdit) return;
    onEdit(tpl);
    onClose();
  }

  return createPortal(
    <div className="modal-overlay active" role="presentation" onClick={onClose}>
      <div
        className="modal-box modal-box-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-template-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-title" id="practice-template-modal-title">
          Practice templates
        </div>
        <p className="modal-subtitle">
          Start from a plan, rename a saved template, or edit its blocks.
        </p>
        <div className="practice-template-list" id="practice-template-list">
          {!templates.length ? (
            <div className="practice-sessions-empty">No templates available.</div>
          ) : (
            templates.map((tpl) => {
              const blockCount = tpl.items?.length || 0;
              const mins = (tpl.items || []).reduce(
                (s, i) => s + (Number(i.durationMin) || 0),
                0,
              );
              return (
                <div key={tpl.id} className="practice-template-row-wrap">
                  <button
                    type="button"
                    className="practice-template-row"
                    onClick={() => {
                      onSelect(tpl);
                      onClose();
                    }}
                  >
                    <div className="practice-template-row-name">
                      {tpl.name}
                      {tpl.builtin ? (
                        <span className="practice-template-badge">Built-in</span>
                      ) : null}
                    </div>
                    <div className="practice-template-row-meta">
                      {blockCount} block{blockCount !== 1 ? "s" : ""}
                      {mins ? ` · ${mins} min` : ""}
                    </div>
                    {tpl.notes ? (
                      <div className="practice-template-row-notes">{tpl.notes}</div>
                    ) : null}
                  </button>
                  {!tpl.builtin ? (
                    <div className="practice-template-row-actions">
                      <button
                        type="button"
                        className="practice-template-action-btn"
                        title="Rename template"
                        onClick={() => void handleRenameTemplate(tpl)}
                      >
                        Rename
                      </button>
                      {onEdit ? (
                        <button
                          type="button"
                          className="practice-template-action-btn"
                          title="Edit template blocks"
                          onClick={() => handleEditTemplate(tpl)}
                        >
                          Edit
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="practice-template-action-btn practice-template-delete"
                        title="Delete template"
                        onClick={() => void handleDeleteTemplate(tpl)}
                      >
                        ×
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="modal-cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
