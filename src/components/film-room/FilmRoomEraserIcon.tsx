interface Props {
  size?: number;
  className?: string;
}

/** Rubber eraser glyph for film room toolbar. */
export function FilmRoomEraserIcon({ size = 18, className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 16.5 13.5 8l5.5 5.5-8.5 8.5H5v-5.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M5 20h5.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M14.2 9.2 18.8 4.6"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M8.2 13.2 11.2 10.2M10.5 15.5 13.5 12.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
