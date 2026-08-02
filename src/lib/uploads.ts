/**
 * 50 MB, matching the bucket's own limit in 0010_document_storage.sql.
 *
 * Kept out of the server action module because a "use server" file may only
 * export async functions.
 */
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const DOCUMENT_CATEGORIES = [
  "General",
  "Drawings",
  "Permits",
  "Contracts",
  "Submittals",
  "Photos",
  "Safety",
  "Invoices",
] as const;
