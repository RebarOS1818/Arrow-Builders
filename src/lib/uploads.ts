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

/**
 * The drawings a parcel is assessed from, in the order they usually arrive.
 *
 * Separate from the project list because they are a different job: these are
 * what you look at to decide whether to buy, not what accumulates once you are
 * building. Each is a named slot on the property page, so an empty one is
 * visibly a gap rather than an absence you have to notice.
 */
export const PARCEL_DRAWINGS = ["Survey", "Plot Plan", "Site Plan", "Sketch"] as const;

/** Anything filed against a parcel that is not one of the four drawings. */
export const PARCEL_CATEGORIES = [...PARCEL_DRAWINGS, "General"] as const;
