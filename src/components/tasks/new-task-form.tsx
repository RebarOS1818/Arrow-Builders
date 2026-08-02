"use client";

import { RecordForm } from "@/components/phases/record-form";
import { createTask } from "@/app/(app)/tasks/actions";

const TRADES = [
  { value: "general", label: "General" },
  { value: "concrete", label: "Concrete" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "finishes", label: "Finishes" },
];

const STATUSES = [
  { value: "unscheduled", label: "Unscheduled" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
];

export function NewTaskForm({ projects }: { projects: { id: string; name: string }[] }) {
  return (
    <RecordForm
      triggerLabel="New task"
      title="New task"
      submitLabel="Create task"
      action={createTask}
      disabled={projects.length === 0}
      disabledReason="Create a project first"
      fields={[
        { name: "title", label: "Title", required: true, placeholder: "Pour slab, building B", wide: true },
        {
          name: "project_id",
          label: "Project",
          type: "select",
          required: true,
          options: projects.map((p) => ({ value: p.id, label: p.name })),
        },
        { name: "trade", label: "Trade", type: "select", options: TRADES, defaultValue: "general" },
        { name: "starts_at", label: "Starts", type: "date" },
        { name: "ends_at", label: "Ends", type: "date" },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: STATUSES,
          hint: "Left blank, a task with a start date is scheduled.",
        },
        { name: "crew_size", label: "Crew size", type: "number", placeholder: "0" },
      ]}
    />
  );
}
