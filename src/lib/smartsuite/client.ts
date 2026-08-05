import "server-only";

import {
  SMARTSUITE_ACCOUNT_ID,
  SMARTSUITE_API_KEY,
  SMARTSUITE_API_URL,
} from "./config";

export type SmartSuiteOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

/**
 * One call to SmartSuite.
 *
 * Auth is a Token header plus the workspace slug in ACCOUNT-ID; both are
 * required and a missing ACCOUNT-ID fails the same way a bad key does, which is
 * why the error below names which one is absent rather than leaving someone to
 * guess between them.
 */
async function call<T>(
  path: string,
  init: RequestInit = {},
): Promise<SmartSuiteOutcome<T>> {
  if (!SMARTSUITE_API_KEY || !SMARTSUITE_ACCOUNT_ID) {
    return {
      ok: false,
      status: 503,
      error: `SmartSuite is not configured. Missing: ${[
        !SMARTSUITE_API_KEY && "SMARTSUITE_API_KEY",
        !SMARTSUITE_ACCOUNT_ID && "SMARTSUITE_ACCOUNT_ID",
      ]
        .filter(Boolean)
        .join(", ")}.`,
    };
  }

  let response: Response;
  try {
    response = await fetch(`${SMARTSUITE_API_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Token ${SMARTSUITE_API_KEY}`,
        "ACCOUNT-ID": SMARTSUITE_ACCOUNT_ID,
        "Content-Type": "application/json",
        ...init.headers,
      },
      cache: "no-store",
    });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : "unknown error";
    return { ok: false, status: 502, error: `Could not reach SmartSuite (${detail}).` };
  }

  const raw = await response.text();

  if (!response.ok) {
    // 403 here means SmartSuite rejected the credentials. It is worth being
    // precise about, because the identical status and body come back when a
    // network's egress policy blocks the host before the request ever arrives —
    // which is exactly how an hour gets lost debugging a key that was fine.
    const hint =
      response.status === 403
        ? " Check the API key and that ACCOUNT-ID matches the workspace it belongs to."
        : "";
    return {
      ok: false,
      status: response.status,
      error: `SmartSuite returned ${response.status}: ${redact(raw.slice(0, 300))}${hint}`,
    };
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return {
      ok: false,
      status: 502,
      error: `SmartSuite returned an unreadable response: ${raw.slice(0, 200)}`,
    };
  }
}

/** The key can appear in echoed request context; it never reaches a response. */
function redact(message: string) {
  return SMARTSUITE_API_KEY ? message.split(SMARTSUITE_API_KEY).join("[api key]") : message;
}

export type Solution = { id: string; name: string; slug?: string };

export type FieldDef = {
  slug: string;
  label: string;
  field_type: string;
};

export type Application = {
  id: string;
  name: string;
  solution?: string;
  structure?: FieldDef[];
};

export function listSolutions() {
  return call<Solution[] | { results: Solution[] }>("/solutions/");
}

export function listApplications(solutionId?: string) {
  const query = solutionId ? `?solution=${encodeURIComponent(solutionId)}` : "";
  return call<Application[] | { results: Application[] }>(`/applications/${query}`);
}

export function getApplication(applicationId: string) {
  return call<Application>(`/applications/${applicationId}/`);
}

/**
 * A page of records. SmartSuite lists records through POST, not GET — the body
 * carries the filter and sort, so a read is a POST here and that is not a bug.
 */
export function listRecords(applicationId: string, limit = 5, offset = 0) {
  return call<{ total: number; items: Record<string, unknown>[] }>(
    `/applications/${applicationId}/records/list/?limit=${limit}&offset=${offset}`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

/** SmartSuite returns either a bare array or a paginated envelope. */
export function unwrap<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}
