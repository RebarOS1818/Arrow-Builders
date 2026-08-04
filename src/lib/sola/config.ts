import "server-only";

import { SUPABASE_SERVICE_ROLE_KEY as SERVICE_ROLE_KEY } from "../supabase/server-config";

/**
 * Sola Payments runs on the Cardknox gateway, so the API host and the field
 * names are Cardknox's. Overridable for anyone pointed at a different endpoint,
 * but the default is what the Sola docs publish.
 */
export const SOLA_API_URL =
  process.env.SOLA_API_URL?.trim().replace(/\/+$/, "") ?? "https://api.cardknox.com/v2";

/** Server-side secret. Never sent to the browser. */
export const SOLA_API_KEY = process.env.SOLA_API_KEY?.trim() ?? "";

/**
 * The *public* iFields key, safe in the browser — it can only tokenize a card,
 * not move money. Kept strictly separate from SOLA_API_KEY: pasting the API key
 * into this variable would publish it in the page source of every visitor.
 */
export const SOLA_IFIELDS_KEY = process.env.NEXT_PUBLIC_SOLA_IFIELDS_KEY?.trim() ?? "";

/**
 * The gateway's webhook PIN, used to verify the `ck-signature` header. Without
 * it any caller who guesses the URL could mark an organization as paid.
 */
export const SOLA_WEBHOOK_PIN = process.env.SOLA_WEBHOOK_PIN?.trim() ?? "";

/**
 * iFields is versioned by URL path, not by a query string, so the version is
 * part of both the script and the iframe `src`. Pinned rather than "latest":
 * an unannounced change to the tokenizer would break the only way to take a
 * payment.
 *
 * A wrong version is not a soft failure — the CDN 404s and there is no card
 * form at all — so this must be a real, current entry from
 * https://cdn.cardknox.com/ifields/versions.htm, checked rather than assumed.
 * Overridable so a bad pin can be corrected from Vercel without a deploy.
 */
export const SOLA_IFIELDS_VERSION =
  process.env.NEXT_PUBLIC_SOLA_IFIELDS_VERSION?.trim() || "3.5.2607.1401";

/**
 * Cardknox requires both on every request and rejects the call outright if
 * either is missing — `{"Error":"Missing: SoftwareName","Result":"E"}`. They are
 * how the gateway attributes traffic, so they identify this app, not the client.
 */
export const SOLA_SOFTWARE_NAME = "Arrow Builders";
export const SOLA_SOFTWARE_VERSION = "1.0";

/**
 * Everything the charge-and-record loop needs.
 *
 * The webhook PIN and the service-role key are part of readiness, not optional
 * extras: without them a card can be charged while the handler that records it
 * answers 503, leaving a paying customer whom the app believes has no plan.
 * Refusing to take the payment is the honest failure.
 */
const REQUIRED_ENV = {
  SOLA_API_KEY,
  NEXT_PUBLIC_SOLA_IFIELDS_KEY: SOLA_IFIELDS_KEY,
  SOLA_WEBHOOK_PIN,
  SUPABASE_SERVICE_ROLE_KEY: SERVICE_ROLE_KEY,
} as const;

export const missingSolaEnv = Object.entries(REQUIRED_ENV)
  .filter(([, value]) => !value)
  .map(([name]) => name);

export const isSolaConfigured = missingSolaEnv.length === 0;

/**
 * A key pasted into the wrong variable is worth catching loudly: Sola's API
 * keys and iFields keys have distinct prefixes, and the mistake publishes a
 * live secret rather than merely failing.
 */
export const solaKeysLookSwapped =
  SOLA_IFIELDS_KEY.length > 0 && !SOLA_IFIELDS_KEY.startsWith("ifields_");
