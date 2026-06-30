interface Props {
  size?: number;
  className?: string;
}

/** Outline drive + plus mark (toolbar cloud save). */
export function GoogleDriveAddIcon({ size = 18, className }: Props) {
  return (
    <img
      className={className}
      src="/icons/google-drive-add-outline.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
