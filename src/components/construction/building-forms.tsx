"use client";

import { RecordForm, type Field } from "@/components/phases/record-form";
import {
  createBuilding,
  createUnit,
  updateBuilding,
  updateUnit,
} from "@/app/(app)/construction/actions";
import type { Building, Unit } from "@/lib/types";

const BUILDING_TYPES = [
  { value: "single_family", label: "Single family" },
  { value: "townhome", label: "Townhome" },
  { value: "multifamily", label: "Multifamily" },
  { value: "commercial", label: "Commercial" },
  { value: "mixed_use", label: "Mixed use" },
  { value: "amenity", label: "Amenity" },
];

const BUILD_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "permitting", label: "Permitting" },
  { value: "under_construction", label: "Under construction" },
  { value: "complete", label: "Complete" },
  { value: "on_hold", label: "On hold" },
];

const UNIT_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "under_construction", label: "Under construction" },
  { value: "complete", label: "Complete" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
  { value: "leased", label: "Leased" },
];

const n = (value: number | null | undefined) =>
  value === null || value === undefined ? "" : String(value);
const d = (value: string | null | undefined) => value?.slice(0, 10) ?? "";
const hidden = (name: string, value: string): Field => ({
  name,
  label: "",
  type: "hidden",
  defaultValue: value,
});

/** A name to pick from a list. Parcels and people arrive in the same shape. */
export type Choice = { id: string; name: string };

/**
 * The fields a building carries, shared by the create and edit forms so the two
 * cannot drift — a create form that collects less than its editor is how a
 * record arrives half-empty and stays that way.
 */
function buildingFields(links: BuildingLinks, building?: Building): Field[] {
  return [
    {
      name: "name",
      label: "Building number",
      required: true,
      placeholder: "Building A",
      defaultValue: building?.name,
      wide: true,
    },
    {
      name: "building_type",
      label: "Type",
      type: "select",
      required: true,
      defaultValue: building?.building_type ?? "single_family",
      options: BUILDING_TYPES,
    },
    {
      name: "status",
      label: "Build status",
      type: "select",
      required: true,
      defaultValue: building?.status ?? "planned",
      options: BUILD_STATUSES,
    },
    { name: "floors", label: "Floors", type: "number", defaultValue: n(building?.floors ?? 1) },
    {
      name: "gross_sqft",
      label: "Gross sqft",
      type: "number",
      defaultValue: n(building?.gross_sqft),
    },
    {
      name: "permit_number",
      label: "Permit number",
      defaultValue: building?.permit_number ?? "",
    },
    {
      name: "permit_issued_at",
      label: "Permit issued",
      type: "date",
      defaultValue: d(building?.permit_issued_at),
    },
    // The parcel and the person. Both optional, and both blankable: a building
    // whose manager has left says nothing rather than naming the wrong person.
    {
      name: "property_id",
      label: "Parcel",
      type: "select",
      defaultValue: building?.property_id ?? "",
      options: links.properties.map((p) => ({ value: p.id, label: p.name })),
      hint: "Only worth setting when the project covers more than one parcel.",
    },
    {
      name: "manager_id",
      label: "Manager",
      type: "select",
      defaultValue: building?.manager_id ?? "",
      options: links.team.map((m) => ({ value: m.id, label: m.name })),
    },
  ];
}

/** The two records a building can point at, resolved by the page that draws it. */
export type BuildingLinks = { properties: Choice[]; team: Choice[] };

export function NewBuildingForm({
  projectId,
  links,
}: {
  projectId: string;
  links: BuildingLinks;
}) {
  return (
    <RecordForm
      triggerLabel="New building"
      title="Add a building"
      description="Units hang off a building, and the sales figures are counted from them."
      submitLabel="Add building"
      action={createBuilding}
      fields={[hidden("project_id", projectId), ...buildingFields(links)]}
    />
  );
}

export function EditBuildingForm({
  building,
  links,
}: {
  building: Building;
  links: BuildingLinks;
}) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title={`Edit ${building.name}`}
      submitLabel="Save"
      action={updateBuilding}
      fields={[
        hidden("id", building.id),
        hidden("project_id", building.project_id),
        ...buildingFields(links, building),
        {
          name: "completed_at",
          label: "Completed",
          type: "date",
          defaultValue: d(building.completed_at),
        },
      ]}
    />
  );
}

function unitFields(unit?: Unit): Field[] {
  return [
    {
      name: "unit_number",
      label: "Unit number",
      required: true,
      placeholder: "101",
      defaultValue: unit?.unit_number,
    },
    {
      name: "unit_type",
      label: "Type",
      placeholder: "2BR",
      defaultValue: unit?.unit_type ?? "",
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      defaultValue: unit?.status ?? "planned",
      options: UNIT_STATUSES,
    },
    { name: "floor", label: "Floor", type: "number", defaultValue: n(unit?.floor) },
    { name: "bedrooms", label: "Bedrooms", type: "number", step: "0.5", defaultValue: n(unit?.bedrooms) },
    { name: "bathrooms", label: "Bathrooms", type: "number", step: "0.5", defaultValue: n(unit?.bathrooms) },
    { name: "sqft", label: "Sqft", type: "number", defaultValue: n(unit?.sqft) },
    { name: "list_price", label: "List price", type: "money", defaultValue: n(unit?.list_price) },
  ];
}

export function NewUnitForm({ buildingId, label }: { buildingId: string; label?: string }) {
  return (
    <RecordForm
      subtle
      triggerLabel={label ?? "Add unit"}
      title="Add a unit"
      submitLabel="Add unit"
      action={createUnit}
      fields={[hidden("building_id", buildingId), ...unitFields()]}
    />
  );
}

export function EditUnitForm({ unit }: { unit: Unit }) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title={`Edit unit ${unit.unit_number}`}
      submitLabel="Save"
      action={updateUnit}
      fields={[
        hidden("id", unit.id),
        hidden("project_id", unit.project_id),
        ...unitFields(unit),
        {
          name: "sold_price",
          label: "Sold price",
          type: "money",
          defaultValue: n(unit.sold_price),
          hint: "What it closed at, which is often not the list price.",
        },
        { name: "closed_at", label: "Closed", type: "date", defaultValue: d(unit.closed_at) },
      ]}
    />
  );
}
