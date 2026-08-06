import type { PropertyStatus } from "./types";

/**
 * The acquisition pipeline: every stage, in order, with the colour it is known
 * by and a line saying what it means.
 *
 * One definition, because the board, the grid, both forms and the status
 * dropdown all render from it. A stage added in four places is a stage that
 * ends up spelled three ways.
 *
 * The colours are taken from the pipeline this replaces, so the board is
 * recognisable to anyone who has been running it. Each stage carries its own
 * text colour rather than assuming white: on yellow, white type is 1.7:1 and
 * unreadable, so those stages take dark ink instead.
 */
export type Stage = {
  status: PropertyStatus;
  label: string;
  hint: string;
  /** Background and foreground for the stage's chip and board header. */
  fill: string;
  /** A tint of the same hue, for the column body. */
  tint: string;
};

export const PIPELINE: Stage[] = [
  {
    status: "prospecting",
    label: "Prospecting",
    hint: "Identified, not yet assessed",
    fill: "bg-blue-600 text-white",
    tint: "bg-blue-50",
  },
  {
    status: "pre_planning",
    label: "Pre-Planning",
    hint: "Feasibility and early diligence",
    fill: "bg-pink-600 text-white",
    tint: "bg-pink-50",
  },
  {
    status: "planning",
    label: "Planning",
    hint: "Design and entitlement",
    fill: "bg-ink text-white",
    tint: "bg-canvas",
  },
  {
    status: "under_contract",
    label: "Under Contract",
    hint: "Offer accepted, not yet closed",
    fill: "bg-cyan-500 text-ink",
    tint: "bg-cyan-50",
  },
  {
    status: "owned_predevelopment",
    label: "Owned — Pre-Development",
    hint: "Closed, work not yet started",
    fill: "bg-violet-600 text-white",
    tint: "bg-violet-50",
  },
  {
    status: "in_development",
    label: "In Development",
    hint: "Under construction",
    fill: "bg-rose-600 text-white",
    tint: "bg-rose-50",
  },
  {
    status: "units_listed",
    label: "Units Listed",
    hint: "On the market",
    fill: "bg-orange-500 text-ink",
    tint: "bg-orange-50",
  },
  {
    status: "partially_sold",
    label: "Partially Sold",
    hint: "Some units closed",
    fill: "bg-amber-400 text-ink",
    tint: "bg-amber-50",
  },
  {
    status: "sold_out",
    label: "Sold Out",
    hint: "Every unit closed",
    fill: "bg-emerald-600 text-white",
    tint: "bg-emerald-50",
  },
  {
    // Not in the pipeline this came from, and kept deliberately: walking away is
    // a real outcome, and without somewhere to record it a dead parcel either
    // sits in Prospecting forever or gets deleted along with its history.
    status: "passed",
    label: "Passed",
    hint: "Walked away",
    fill: "bg-ink-subtle text-white",
    tint: "bg-shell",
  },
];

export const stageOf = (status: PropertyStatus) =>
  PIPELINE.find((s) => s.status === status) ?? PIPELINE[0]!;

/** For a select: value and label, in pipeline order. */
export const STAGE_OPTIONS = PIPELINE.map((s) => ({ value: s.status, label: s.label }));

export const PROPERTY_TYPE_OPTIONS = [
  { value: "single_family_lot", label: "Single-Family Lot" },
  { value: "multi_family_lot", label: "Multi-Family Lot" },
];
