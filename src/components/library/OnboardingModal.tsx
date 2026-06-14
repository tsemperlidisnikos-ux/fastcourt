"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useClientMounted } from "@/hooks/useClientMounted";
import "@/styles/fc-onboarding.css";

type View = "choices" | "tour";

interface Props {
  open: boolean;
  onClose: () => void;
  onNewPlay: () => void;
  onImportFdb: () => void;
}

const TOUR_STEPS = [
  {
    title: "Draw",
    body: "Create and organize plays and drills. Use filters, preview frames, and open the designer.",
  },
  {
    title: "Playbooks & Practice",
    body: "Group plays into playbooks, print or share them, and build practice sessions with a live timer.",
  },
  {
    title: "Designer",
    body: "Place players, draw passes and cuts, step through frames, and animate your play.",
  },
] as const;

export function OnboardingModal({
  open,
  onClose,
  onNewPlay,
  onImportFdb,
}: Props) {
  const mounted = useClientMounted();
  const [view, setView] = useState<View>("choices");

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="modal-overlay active fc-onboarding-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="modal-box fc-onboarding-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fc-onboarding-title"
        onClick={(e) => e.stopPropagation()}
      >
        {view === "choices" ? (
          <>
            <div className="fc-onboarding-icon" aria-hidden="true">
              ✓
            </div>
            <h2 className="modal-title" id="fc-onboarding-title">
              Welcome to FastCourt
            </h2>
            <p className="modal-subtitle fc-onboarding-lead">
              Your workspace is ready. What would you like to do first?
            </p>
            <div className="fc-onboarding-actions">
              <button
                type="button"
                className="fc-onboarding-action is-primary"
                onClick={onNewPlay}
              >
                <span className="fc-onboarding-action-title">Create a new play</span>
                <span className="fc-onboarding-action-desc">
                  Start from a blank court in the designer
                </span>
              </button>
              <button
                type="button"
                className="fc-onboarding-action"
                onClick={onImportFdb}
              >
                <span className="fc-onboarding-action-title">Import .fdb file</span>
                <span className="fc-onboarding-action-desc">
                  Bring plays from FastDraw or a backup
                </span>
              </button>
              <button
                type="button"
                className="fc-onboarding-action"
                onClick={() => setView("tour")}
              >
                <span className="fc-onboarding-action-title">Quick tour</span>
                <span className="fc-onboarding-action-desc">
                  See what you can do in the library and designer
                </span>
              </button>
            </div>
            <button
              type="button"
              className="fc-onboarding-skip"
              onClick={onClose}
            >
              Skip for now
            </button>
          </>
        ) : (
          <>
            <h2 className="modal-title" id="fc-onboarding-title">
              Quick tour
            </h2>
            <ol className="fc-onboarding-tour">
              {TOUR_STEPS.map((step, index) => (
                <li key={step.title} className="fc-onboarding-tour-step">
                  <span className="fc-onboarding-tour-num">{index + 1}</span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="fc-onboarding-tour-footer">
              <button
                type="button"
                className="modal-btn modal-btn-secondary"
                onClick={() => setView("choices")}
              >
                Back
              </button>
              <button type="button" className="modal-btn modal-btn-primary" onClick={onClose}>
                Got it
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
