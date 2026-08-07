import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * The brand mark as a PNG, for email.
 *
 * Email is the one place the app cannot use its own SVG. Outlook renders with
 * Word's engine and ignores SVG entirely; several webmail clients strip it as
 * an attack surface. So the mark is rasterised here, served from a stable URL,
 * and requested by the template.
 *
 * Drawn at 3× the size it is displayed at, because a mail client on a phone is
 * showing it on a screen with three device pixels to the CSS pixel and will not
 * ask for a bigger one.
 *
 * Cached hard: the mark changes when the brand changes, which is not a thing
 * that happens between two sends of the same email.
 */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "144px",
          height: "144px",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#344058",
          borderRadius: "32px",
        }}
      >
        <svg width="90" height="61" viewBox="0 0 202 136" fill="#f6b037">
          <path d="M90 0 L0 67 L0 136 L90 136 Z" />
          <path d="M112 0 L202 67 L202 136 L112 136 Z" />
        </svg>
      </div>
    ),
    {
      width: 144,
      height: 144,
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
      },
    },
  );
}
