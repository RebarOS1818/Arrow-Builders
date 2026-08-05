import "server-only";

/**
 * SmartSuite, read from Vercel rather than from anyone's machine.
 *
 * A SmartSuite API key is workspace-wide and read-write, so it is treated the
 * same as the payment gateway's: server-only, never sent to the browser, never
 * echoed back in a response. Nothing here is prefixed NEXT_PUBLIC and nothing
 * should be.
 */
export const SMARTSUITE_API_URL =
  process.env.SMARTSUITE_API_URL?.trim().replace(/\/+$/, "") ??
  "https://api.smartsuite.com/api/v1";

export const SMARTSUITE_API_KEY = process.env.SMARTSUITE_API_KEY?.trim() ?? "";

/** The workspace slug, sent as the ACCOUNT-ID header on every request. */
export const SMARTSUITE_ACCOUNT_ID = process.env.SMARTSUITE_ACCOUNT_ID?.trim() ?? "";

/**
 * Optional. Set it to look at one solution; leave it unset to enumerate all of
 * them, which is what the first inspection wants.
 */
export const SMARTSUITE_SOLUTION_ID = process.env.SMARTSUITE_SOLUTION_ID?.trim() ?? "";

const REQUIRED = {
  SMARTSUITE_API_KEY,
  SMARTSUITE_ACCOUNT_ID,
} as const;

export const missingSmartSuiteEnv = Object.entries(REQUIRED)
  .filter(([, v]) => !v)
  .map(([name]) => name);

export const isSmartSuiteConfigured = missingSmartSuiteEnv.length === 0;
