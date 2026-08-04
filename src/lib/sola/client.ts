import "server-only";

import {
  SOLA_API_KEY,
  SOLA_API_URL,
  SOLA_SOFTWARE_NAME,
  SOLA_SOFTWARE_VERSION,
} from "./config";

/**
 * Every Cardknox response carries a Result of "S" or "E". A non-2xx status is
 * rare — a rejected key still comes back as 200 with Result "E" — so the status
 * code alone is not a usable success test.
 */
type SolaResponse = Record<string, string | number | boolean | null | undefined> & {
  Result?: string;
  Error?: string;
};

export type SolaOutcome<T = SolaResponse> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * One call to the recurring API.
 *
 * Everything is POST, including the reads — there are no REST verbs or path
 * parameters here, just an endpoint name and a JSON body. `SoftwareName` and
 * `SoftwareVersion` are injected rather than left to each caller, because
 * omitting either fails the request with a message that reads like a bug in our
 * own code.
 */
export async function sola<T = SolaResponse>(
  endpoint: string,
  body: Record<string, unknown> = {},
): Promise<SolaOutcome<T>> {
  if (!SOLA_API_KEY) return { ok: false, error: "Sola is not configured." };

  let response: Response;
  try {
    response = await fetch(`${SOLA_API_URL}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: SOLA_API_KEY,
        "X-Recurring-Api-Version": "2.0",
      },
      body: JSON.stringify({
        ...body,
        SoftwareName: SOLA_SOFTWARE_NAME,
        SoftwareVersion: SOLA_SOFTWARE_VERSION,
      }),
      // Billing is never worth serving from a cache.
      cache: "no-store",
    });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : "unknown error";
    return { ok: false, error: `Could not reach Sola (${detail}).` };
  }

  const raw = await response.text();

  let parsed: SolaResponse;
  try {
    parsed = JSON.parse(raw) as SolaResponse;
  } catch {
    // A gateway error page rather than an API response. Truncated so a stray
    // HTML document does not become the error text shown to a customer.
    return {
      ok: false,
      error: `Sola returned an unreadable response (HTTP ${response.status}): ${raw.slice(0, 200)}`,
    };
  }

  if (parsed.Result !== "S") {
    return { ok: false, error: redact(String(parsed.Error ?? "Sola refused the request.")) };
  }

  return { ok: true, data: parsed as T };
}

/**
 * Cardknox echoes request fields back in some error messages. The API key is
 * one of them, and these messages reach the browser.
 */
function redact(message: string) {
  return SOLA_API_KEY ? message.split(SOLA_API_KEY).join("[api key]") : message;
}

/** Amounts cross the wire as decimal strings — "29.00", not 2900. */
export function solaAmount(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Cardknox wants MMYY with no separator. */
export function solaExpiry(month: number, year: number) {
  const mm = String(month).padStart(2, "0");
  const yy = String(year % 100).padStart(2, "0");
  return `${mm}${yy}`;
}

/**
 * Schedule dates are YYYY-MM-DD.
 *
 * Not the MM/DD/YYYY the gateway uses elsewhere — the recurring API documents
 * this one as ISO, and a date in the wrong shape is rejected outright.
 */
export function solaDate(date: Date) {
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}-${mm}-${dd}`;
}
