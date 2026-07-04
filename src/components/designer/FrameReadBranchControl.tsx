"use client";

import {
  COUNTER_COVERAGE_LABELS,
  type CounterCoverageId,
} from "@/lib/film-room/film-counter-playbook";
import { defaultReadLabelForDisruption } from "@/lib/film-room/film-disruption-detector";
import {
  frameThumbBadge,
  isReadFrame,
  primaryFrameLabel,
} from "@/lib/designer/frame-read-branch";
import type { FrameReadBranch } from "@/types/designer";

const READ_COVERAGE_OPTIONS: CounterCoverageId[] = [
  "ice",
  "switch",
  "drop",
  "hedge",
  "trap",
  "blitz",
  "show",
  "other",
];

interface Props {
  readBranch?: FrameReadBranch;
  isPrimaryFrame: boolean;
  parentFrameName?: string;
  onSetReadBranch: (branch: FrameReadBranch | undefined) => void;
  onAddReadFrame: (coverage: string, label: string) => void;
}

export function FrameReadBranchControl({
  readBranch,
  isPrimaryFrame,
  parentFrameName,
  onSetReadBranch,
  onAddReadFrame,
}: Props) {
  const coverage = readBranch?.coverage ?? "";
  const label = readBranch?.label ?? "";

  if (!isPrimaryFrame && !readBranch?.label) {
    return null;
  }

  return (
    <div className="ds-read-branch-control" aria-label="Offensive read branch">
      {isReadFrame({ readBranch, id: "", name: "", objects: [], actions: [] }) ? (
        <>
          <span className="ds-read-branch-badge">
            {frameThumbBadge({ readBranch, id: "", name: "", objects: [], actions: [] }) ??
              "READ"}
          </span>
          {parentFrameName ? (
            <span className="ds-read-branch-parent">from {parentFrameName}</span>
          ) : null}
          <label className="ds-read-branch-field">
            <span>Read label</span>
            <input
              type="text"
              value={label}
              maxLength={80}
              placeholder="If ICE — Reject"
              onChange={(e) =>
                onSetReadBranch({
                  label: e.target.value,
                  coverage: coverage || undefined,
                  parentFrameId: readBranch?.parentFrameId,
                })
              }
            />
          </label>
          <label className="ds-read-branch-field">
            <span>Coverage trigger</span>
            <select
              value={coverage || "other"}
              onChange={(e) => {
                const coverage = e.target.value as CounterCoverageId;
                onSetReadBranch({
                  label: label || defaultReadLabelForDisruption(coverage),
                  coverage,
                  parentFrameId: readBranch?.parentFrameId,
                });
              }}
            >
              {READ_COVERAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {COUNTER_COVERAGE_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="ds-read-branch-clear"
            onClick={() => onSetReadBranch(undefined)}
          >
            Clear read branch
          </button>
        </>
      ) : (
        <>
          <p className="ds-read-branch-hint">
            Primary frame — add read branches when defense disrupts this action.
          </p>
          <div className="ds-read-branch-quick">
            {(["ice", "switch", "hedge", "trap"] as CounterCoverageId[]).map(
              (cov) => (
                <button
                  key={cov}
                  type="button"
                  className="ds-read-branch-quick-btn"
                  onClick={() =>
                    onAddReadFrame(
                      cov,
                      defaultReadLabelForDisruption(cov),
                    )
                  }
                >
                  + {COUNTER_COVERAGE_LABELS[cov]}
                </button>
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}

export { primaryFrameLabel, isReadFrame, frameThumbBadge };
