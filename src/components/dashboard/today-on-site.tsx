import Link from "next/link";
import { AvatarStack } from "@/components/ui/avatar";
import { formatTime } from "@/lib/utils";
import type { EventWithProject } from "@/lib/types";

export function TodayOnSite({ events }: { events: EventWithProject[] }) {
  return (
    <section className="card flex flex-col p-4">
      <h2 className="font-semibold tracking-tight">Today on Site</h2>

      <ol className="relative mt-4 flex-1 space-y-5">
        {events.length > 1 && (
          <span className="absolute left-[3px] top-2 -z-0 h-[calc(100%-1.5rem)] w-px bg-line" />
        )}

        {events.map((event) => (
          <li key={event.id} className="relative flex gap-3">
            <span className="relative z-10 mt-1.5 size-[7px] shrink-0 rounded-full bg-brand-600 ring-4 ring-surface" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-ink-muted">{formatTime(event.scheduled_at)}</p>
              <p className="mt-0.5 text-sm font-semibold">{event.title}</p>
              <p className="text-xs text-ink-muted">{event.project.name}</p>
              <div className="mt-1.5">
                <AvatarStack
                  people={event.crew}
                  max={3}
                  size="xs"
                />
              </div>
            </div>
          </li>
        ))}

        {events.length === 0 && (
          <li className="py-6 text-center text-sm text-ink-muted">Nothing scheduled on site today.</li>
        )}
      </ol>

      <Link
        href="/schedule"
        className="mt-4 border-t border-line pt-3 text-sm font-medium text-brand-700 hover:underline"
      >
        View full schedule
      </Link>
    </section>
  );
}
