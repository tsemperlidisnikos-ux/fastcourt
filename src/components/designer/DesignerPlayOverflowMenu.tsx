"use client";

type MenuAction = () => void;

interface Props {
  open: boolean;
  exportingAnim?: boolean;
  onShareLink: MenuAction;
  onExportVideo: MenuAction;
  onExportImages: MenuAction;
  onEmbedCode: MenuAction;
  onDownload: MenuAction;
  onPrint: MenuAction;
}

function MenuIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="ds-fd-overflow-menu-icon" aria-hidden="true">
      {children}
    </span>
  );
}

function MenuItem({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  onClick: MenuAction;
}) {
  return (
    <button
      type="button"
      className="ds-fd-overflow-menu-item"
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <MenuIcon>{icon}</MenuIcon>
      <span className="ds-fd-overflow-menu-label">{label}</span>
    </button>
  );
}

export function DesignerPlayOverflowMenu({
  open,
  exportingAnim = false,
  onShareLink,
  onExportVideo,
  onExportImages,
  onEmbedCode,
  onDownload,
  onPrint,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="ds-fd-overflow-menu ds-fd-overflow-menu-icons"
      role="menu"
      onClick={(e) => e.stopPropagation()}
    >
      <MenuItem
        label="Share as Link"
        icon={
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.59 13.51 6.82 3.98" />
            <path d="M15.41 6.51l-6.82 3.98" />
          </svg>
        }
        onClick={onShareLink}
      />
      <MenuItem
        label="Export MP4"
        disabled={exportingAnim}
        icon={
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="6" width="13" height="12" rx="2" />
            <path d="M16 10l5-3v10l-5-3z" />
          </svg>
        }
        onClick={onExportVideo}
      />
      <MenuItem
        label="Export Images"
        icon={
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="10" r="1.5" fill="currentColor" stroke="none" />
            <path d="m3 16 5-5 4 4 3-3 6 6" />
          </svg>
        }
        onClick={onExportImages}
      />
      <MenuItem
        label="Create Embed Code"
        icon={
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m8 8-4 4 4 4" />
            <path d="m16 8 4 4-4 4" />
            <path d="M14 4 10 20" />
          </svg>
        }
        onClick={onEmbedCode}
      />
      <div className="ds-fd-overflow-menu-sep" role="separator" />
      <MenuItem
        label="Download"
        icon={
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 19h14" />
          </svg>
        }
        onClick={onDownload}
      />
      <MenuItem
        label="Print"
        icon={
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 9V3h10v6" />
            <rect x="5" y="9" width="14" height="8" rx="1" />
            <path d="M7 14h10v7H7z" />
          </svg>
        }
        onClick={onPrint}
      />
    </div>
  );
}
