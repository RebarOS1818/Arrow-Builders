"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { TRADE_LABELS } from "@/components/ui/badge";
import type { Trade } from "@/lib/types";

export type NewTaskInput = {
  projectId: string;
  title: string;
  trade: Trade;
  date: string | null;
  crewSize: number;
};

export function CreateTaskModal({
  projects,
  defaultDate,
  onClose,
  onCreate,
}: {
  projects: { id: string; name: string }[];
  defaultDate: string | null;
  onClose: () => void;
  onCreate: (input: NewTaskInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [trade, setTrade] = useState<Trade>("general");
  const [date, setDate] = useState(defaultDate ?? "");
  const [crewSize, setCrewSize] = useState(2);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !projectId) return;
    setPending(true);
    setError(null);
    try {
      await onCreate({
        projectId,
        title: title.trim(),
        trade,
        date: date || null,
        crewSize,
      });
      onClose();
    } catch (cause) {
      // Keep the dialog open so the entered values are not lost.
      setError(cause instanceof Error ? cause.message : "Could not create the task.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create task"
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Create Task</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-8 place-items-center rounded-lg text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium">Title</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Drywall – Level 3"
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">Project</span>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium">Trade</span>
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value as Trade)}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                {(Object.keys(TRADE_LABELS) as Trade[]).map((t) => (
                  <option key={t} value={t}>
                    {TRADE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium">Crew size</span>
              <input
                type="number"
                min={1}
                max={20}
                value={crewSize}
                onChange={(e) => setCrewSize(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium">
              Date <span className="font-normal text-ink-muted">(leave empty for backlog)</span>
            </span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
}
