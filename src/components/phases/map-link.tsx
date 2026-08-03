import { MapPin } from "lucide-react";

/**
 * Builds the Google Maps query for an address.
 *
 * Returns null when there is nothing worth searching for. A parcel with only a
 * state would drop the user in the middle of Texas, which is worse than no link
 * at all — so a street address or a city is the minimum.
 */
export function mapsQuery(parts: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
}) {
  const address = parts.address?.trim();
  const city = parts.city?.trim();
  const state = parts.state?.trim();
  if (!address && !city) return null;
  return [address, city, state].filter(Boolean).join(", ");
}

/**
 * Coordinates beat text every time.
 *
 * A picked suggestion carries the exact point, so the link goes straight there
 * instead of asking Google to re-guess an address it already resolved once.
 */
export function coordQuery(latitude?: number | null, longitude?: number | null) {
  if (latitude === null || latitude === undefined) return null;
  if (longitude === null || longitude === undefined) return null;
  return `${latitude},${longitude}`;
}

export function mapsUrl(query: string) {
  // The documented cross-platform entry point: it hands off to the Google Maps
  // app on a phone and the website on a desktop, without either being hardcoded.
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * An address that opens in Google Maps.
 *
 * Renders as plain text when there is no usable address, so a parcel entered
 * without one does not present a link that lands nowhere.
 */
export function MapLink({
  address,
  city,
  state,
  latitude,
  longitude,
  suffix,
  className,
  showIcon = true,
}: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Trailing text kept outside the link, such as a parcel number. */
  suffix?: string;
  className?: string;
  showIcon?: boolean;
}) {
  const query = coordQuery(latitude, longitude) ?? mapsQuery({ address, city, state });
  const label = [address, city, state].map((p) => p?.trim()).filter(Boolean).join(", ");

  if (!query) {
    return (
      <span className={className}>
        {showIcon && <MapPin className="size-3.5 shrink-0" />}
        {label || "No address"}
        {suffix}
      </span>
    );
  }

  return (
    <span className={className}>
      {showIcon && <MapPin className="size-3.5 shrink-0" />}
      <a
        href={mapsUrl(query)}
        target="_blank"
        rel="noopener noreferrer"
        title={
          coordQuery(latitude, longitude)
            ? "Open in Google Maps — exact location"
            : "Open in Google Maps — searched by address"
        }
        className="rounded-sm underline decoration-dotted underline-offset-4 hover:text-brand-700 hover:decoration-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {label}
      </a>
      {suffix}
    </span>
  );
}
