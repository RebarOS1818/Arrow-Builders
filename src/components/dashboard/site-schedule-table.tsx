import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { formatTime } from "@/lib/utils";
import type { EventWithProject } from "@/lib/types";

/** "Your Lesson"-style table, carrying today's on-site schedule. */
export function SiteScheduleTable({ events }: { events: EventWithProject[] }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Today on Site</h2>
        <Link href="/schedule" className="text-sm font-medium text-brand-700 hover:underline">
          See all
        </Link>
      </div>

      <div className="card mt-3.5 scroll-thin overflow-x-auto p-1.5">
        <table className="w-full min-w-[560px] border-separate border-spacing-y-1 text-sm">
          <thead>
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
              <th className="px-4 py-2.5">Crew</th>
              <th className="px-4 py-2.5">Project</th>
              <th className="px-4 py-2.5">Activity</th>
              <th className="px-4 py-2.5 text-right">Open</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const first = event.crew[0];
              return (
                <tr key={event.id} className="group">
                  <td className="rounded-l-tile px-4 py-3 group-hover:bg-canvas">
                    <div className="flex items-center gap-2.5">
                      {first ? (
                        <Avatar
                          name={first.full_name}
                          initials={first.initials}
                          size="md"
                        />
                      ) : (
                        <span className="size-8 rounded-full bg-canvas" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-medium leading-tight">
                          {first?.full_name ?? "Unassigned"}
                        </p>
                        <p className="text-xs text-ink-subtle">
                          {formatTime(event.scheduled_at)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 group-hover:bg-canvas">
                    <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">
                      {event.project.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted group-hover:bg-canvas">
                    {event.title}
                  </td>
                  <td className="rounded-r-tile px-4 py-3 text-right group-hover:bg-canvas">
                    <Link
                      href={`/projects/${event.project_id}`}
                      aria-label={`Open ${event.project.name}`}
                      className="inline-grid size-8 place-items-center rounded-full border border-brand-200 text-brand-600 transition-colors hover:bg-brand-50"
                    >
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}

            {events.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-ink-muted">
                  Nothing scheduled on site today.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
