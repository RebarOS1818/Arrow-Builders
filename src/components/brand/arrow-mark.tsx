/**
 * The Arrow Upscale Builders mark: two roof planes rising to a peak, split by a
 * centre gap.
 *
 * Redrawn as real vector geometry. The supplied artwork is a bitmap inside an
 * SVG wrapper — a JPEG in the light version, a PNG in the dark one — with the
 * background baked in, so it cannot be placed on a coloured surface and turns
 * to mush at the sizes this is used at: a 36px navigation tile and a 16px
 * browser tab.
 *
 * The path is traced from the 1600px original rather than eyeballed. The outer
 * edges are straight lines from the peak to the shoulder, checked against three
 * scan rows and matching within two pixels, which is the artwork's own
 * anti-aliasing.
 *
 * `currentColor` so one file serves the amber-on-navy tile, a navy-on-white
 * lockup, and a monochrome favicon without three copies drifting apart.
 */
export function ArrowMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 202 136"
      className={className}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M90 0 L0 67 L0 136 L90 136 Z" />
      <path d="M112 0 L202 67 L202 136 L112 136 Z" />
    </svg>
  );
}
