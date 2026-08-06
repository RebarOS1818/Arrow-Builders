import Link from "next/link";
import { ArrowRight, Building2, FileSignature, HardHat, Home, ListChecks } from "lucide-react";
import { StatusPill } from "@/components/phases/badges";
import type { PropertyOutcome } from "@/lib/data";

/**
 * What the parcel became.
 *
 * Acquisition ends somewhere, and until now it ended nowhere: the studies, the
 * pro formas and the winning offer sat on the property, a project was created
 * separately, and nothing recorded that they were the same piece of ground. So
 * you could not stand on the parcel you bought and ask what happened next.
 *
 * The counts are the answer to "is there anything there", not a second copy of
 * the construction page — printing twenty unit numbers on an acquisition record
 * would be reading the wrong screen. Each one is a way through to where that
 * work actually lives.
 *
 * A count of zero is shown rather than hidden. "No contracts yet" on a project
 * under construction is information; a missing row is just a missing row.
 */
export function ParcelOutcome({ outcome }: { outcome: PropertyOutcome }) {
  const { project } = outcome;

  const links = [
    { icon: ListChecks, label: "Tasks", count: outcome.tasks, href: `/tasks?project=${project.id}` },
    {
      icon: FileSignature,
      label: "Contracts",
      count: outcome.contracts,
      href: `/construction?project=${project.id}`,
    },
    {
      icon: Building2,
      label: "Buildings",
      count: outcome.buildings,
      href: `/projects/${project.id}`,
    },
    { icon: Home, label: "Units", count: outcome.units, href: `/projects/${project.id}` },
  ];

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">What this became</h2>
      <div className="card mt-3 overflow-hidden">
        <Link
          href={`/projects/${project.id}`}
          className="flex items-center gap-3 p-4 transition-colors hover:bg-canvas/60"
        >
          <span className="icon-tile size-10 bg-brand-700 text-accent-500">
            <HardHat className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 font-semibold tracking-tight">
              {project.name}
              <StatusPill kind="project" value={project.status} />
            </p>
            <p className="mt-0.5 text-sm text-ink-muted">
              {project.completion_pct}% complete
            </p>
          </div>
          <ArrowRight className="size-4.5 shrink-0 text-brand-700" />
        </Link>

        <div className="grid grid-cols-2 border-t border-line sm:grid-cols-4">
          {links.map((link, index) => (
            <Link
              key={link.label}
              href={link.href}
              className={`flex items-center gap-2.5 p-4 transition-colors hover:bg-canvas/60 ${
                // Dividers between, never trailing — and the row wraps to two on
                // a phone, so the vertical rule has to disappear at the fold.
                index % 2 === 1 ? "" : "border-r border-line"
              } ${index < 2 ? "border-b border-line sm:border-b-0" : ""} sm:border-r sm:last:border-r-0`}
            >
              <span className="icon-tile size-9 bg-canvas text-ink-subtle">
                <link.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-semibold tabular-nums leading-none">
                  {link.count}
                </span>
                <span className="block text-xs text-ink-subtle">{link.label}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
