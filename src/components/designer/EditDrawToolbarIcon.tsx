interface Props {
  size?: number;
  className?: string;
}

/** Edit / draw toolbar glyph (PNG from design asset). */
export function EditDrawToolbarIcon({ size, className }: Props) {
  return (
    <img
      className={className ?? "ds-edit-draw-glyph"}
      src="/icons/designer-edit-draw.png"
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}
