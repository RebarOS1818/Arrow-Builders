import Link from "next/link";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import type { Profile } from "@/lib/types";

/** "Your mentor"-style list, carrying the crew leads. */
export function CrewPanel({ crew }: { crew: Profile[] }) {
  return (
    <section>
      <div className="flex items-center justify-between gap-3 px-1">
        <h2 className="font-semibold tracking-tight">Your crew</h2>
        <Link
          href="/teams"
          aria-label="Invite crew member"
          className="grid size-7 place-items-center rounded-full bg-surface text-brand-600 shadow-soft hover:bg-brand-50"
        >
          <Plus className="size-4" />
        </Link>
      </div>

      <div className="card mt-3 p-3">
        <ul className="space-y-1">
          {crew.slice(0, 3).map((member) => (
            <li key={member.id} className="flex items-center gap-3 rounded-tile p-2">
              <Avatar name={member.full_name} initials={member.initials} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">
                  {member.full_name}
                </p>
                <p className="truncate text-xs text-ink-subtle">{member.role}</p>
              </div>
              <Link
                href="/teams"
                className="shrink-0 rounded-full border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-50"
              >
                View
              </Link>
            </li>
          ))}

          {crew.length === 0 && (
            <li className="py-6 text-center text-sm text-ink-muted">No crew yet.</li>
          )}
        </ul>

        <Link
          href="/teams"
          className="mt-2 block rounded-tile bg-brand-50 py-2.5 text-center text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
        >
          See All
        </Link>
      </div>
    </section>
  );
}
