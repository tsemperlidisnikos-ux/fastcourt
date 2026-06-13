interface Props {
  size?: number;
  className?: string;
}

export function PrintPreviewIcon({ size = 40, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="10" y="8" width="34" height="22" rx="2" fill="#111" />
      <rect x="14" y="4" width="26" height="8" rx="1" fill="#fff" stroke="#111" strokeWidth="1.5" />
      <rect x="16" y="32" width="30" height="18" rx="2" fill="#fff" stroke="#111" strokeWidth="2" />
      <line x1="20" y1="38" x2="42" y2="38" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="43" x2="42" y2="43" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="48" x2="36" y2="48" stroke="#111" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="18" r="1.6" fill="#fff" />
      <circle cx="24" cy="18" r="1.6" fill="#fff" />
      <circle cx="30" cy="18" r="1.6" fill="#fff" />
      <circle cx="46" cy="30" r="11" fill="#fff" stroke="#111" strokeWidth="2.5" />
      <circle cx="46" cy="30" r="7" fill="none" stroke="#111" strokeWidth="1.5" />
      <line x1="53" y1="37" x2="58" y2="42" stroke="#111" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
