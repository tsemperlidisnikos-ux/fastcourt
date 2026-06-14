"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useClientMounted } from "@/hooks/useClientMounted";
import {
  deleteCustomPracticeTemplate,
  getAllPracticeTemplates,
} from "@/lib/practice/templates";
import { appConfirm } from "@/stores/dialog-store";
import type { PracticeTemplate } from "@/types/library-meta";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (template: PracticeTemplate) => void;
}

export function PracticeTemplateModal({ open, onClose, onSelect }: Props) {
  const mounted = useClientMounted();
  if (!open || !mounted) return null;
  return (
    <PracticeTemplateModalBody onClose={onClose} onSelect={onSelect} />
  );
}

function PracticeTemplateModalBody({
  onClose,
  onSelect,
}: Pick<Props, "onClose" | "onSelect">) {
  const [templates, setTemplates] = useState<PracticeTemplate[]>([]);

  useEffect(() => {
    void getAllPracticeTemplates().then(setTemplates);
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
    setTemplates(await getAllPracticeTemplates());
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
          Start from template
        </div>
        <p className="modal-subtitle">
          Built-in plans or your saved templates.
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
                    <button
                      type="button"
                      className="practice-template-delete"
                      title="Delete template"
                      onClick={() => void handleDeleteTemplate(tpl)}
                    >
                      ×
                    </button>
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
