export function ActionTimelineDragIcon() {
  return (
    <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
      <circle cx="2.5" cy="2.5" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="2.5" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="8" r="1.2" fill="currentColor" />
      <circle cx="2.5" cy="13.5" r="1.2" fill="currentColor" />
      <circle cx="7.5" cy="13.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

/** Hoops Geek "rewind the clock" — run with previous action. */
export function ActionTimelineSyncIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M10 4.5a5.5 5.5 0 1 1-3.89 1.61"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M4.5 3.5V7H8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Hoops Geek "alternative path" — optional action. */
export function ActionTimelineOptionalIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M4 14.5c2.2-4.5 4.2-6.5 6-6.5s3.2 1.2 6 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M13.5 12l2.5 0 0 2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ActionTimelineMoreIcon() {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
      <circle cx="10" cy="4.5" r="1.4" fill="currentColor" />
      <circle cx="10" cy="10" r="1.4" fill="currentColor" />
      <circle cx="10" cy="15.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

export function ActionTimelineHelpIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
      <path
        d="M6.2 6.1c.2-1.2 1.2-2 2.5-2 1.4 0 2.4.8 2.4 2 0 1.4-1.5 1.8-2.1 2.5-.4.5-.5.9-.5 1.4"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="8" cy="12.1" r="0.75" fill="currentColor" />
    </svg>
  );
}
