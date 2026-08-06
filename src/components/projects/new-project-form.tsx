"use client";

import { RecordForm } from "@/components/phases/record-form";
import { createProject, updateProject } from "@/app/(app)/projects/actions";
import type { Project } from "@/lib/types";

const STATUSES = [
  { value: "on_schedule", label: "On schedule" },
  { value: "behind_schedule", label: "Behind schedule" },
  { value: "at_risk", label: "At risk" },
  { value: "complete", label: "Complete" },
];

export function NewProjectForm({
  properties = [],
}: {
  /** Parcels that reached the build decision, offered as the project's origin. */
  properties?: { id: string; name: string }[];
}) {
  return (
    <RecordForm
      triggerLabel="New project"
      title="New project"
      description="A job under construction. Contracts, tasks and documents all hang off it."
      submitLabel="Create project"
      action={createProject}
      fields={[
        { name: "name", label: "Name", required: true, placeholder: "Riverside Commons", wide: true },
        { name: "city", label: "City", placeholder: "Austin" },
        { name: "state", label: "State", placeholder: "TX" },
        { name: "status", label: "Status", type: "select", options: STATUSES, defaultValue: "on_schedule" },
        { name: "target_date", label: "Target completion", type: "date" },
        { name: "budget_total", label: "Budget", type: "money", placeholder: "0.00" },
        { name: "budget_spent", label: "Spent to date", type: "money", placeholder: "0.00" },
        {
          name: "completion_pct",
          label: "Complete",
          type: "number",
          placeholder: "0",
          hint: "Percent, 0 to 100.",
        },
        ...(properties.length > 0
          ? [
              {
                name: "property_id",
                label: "From property",
                type: "select" as const,
                options: properties.map((p) => ({ value: p.id, label: p.name })),
                hint: "Optional. Links the job back to the parcel it came from.",
                wide: true,
              },
            ]
          : []),
      ]}
    />
  );
}

export function EditProjectForm({
  project,
  properties = [],
}: {
  project: Project;
  properties?: { id: string; name: string }[];
}) {
  return (
    <RecordForm
      triggerLabel="Edit"
      title="Edit project"
      submitLabel="Save"
      action={updateProject}
      edit
      fields={[
        { name: "id", label: "", type: "hidden", defaultValue: project.id },
        { name: "name", label: "Name", required: true, defaultValue: project.name, wide: true },
        { name: "city", label: "City", defaultValue: project.city },
        { name: "state", label: "State", defaultValue: project.state },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: STATUSES,
          defaultValue: project.status,
        },
        {
          name: "target_date",
          label: "Target completion",
          type: "date",
          defaultValue: project.target_date?.slice(0, 10),
        },
        { name: "budget_total", label: "Budget", type: "money", defaultValue: String(project.budget_total) },
        { name: "budget_spent", label: "Spent to date", type: "money", defaultValue: String(project.budget_spent) },
        {
          name: "completion_pct",
          label: "Complete",
          type: "number",
          defaultValue: String(project.completion_pct),
          hint: "Percent, 0 to 100.",
        },
        ...(properties.length > 0
          ? [
              {
                name: "property_id",
                label: "From property",
                type: "select" as const,
                options: properties.map((p) => ({ value: p.id, label: p.name })),
                defaultValue: project.property_id ?? "",
                hint: "The parcel this was built on. Carries its studies and pro formas across.",
                wide: true,
              },
            ]
          : []),
      ]}
    />
  );
}
