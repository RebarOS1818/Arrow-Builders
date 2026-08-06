import Link from "next/link";
import { ArrowRight, Check, HardHat, Landmark, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  href: string;
  label: string;
  hint: string;
  icon: React.ElementType;
  done: boolean;
};

/**
 * What a brand-new organization sees instead of a dashboard of zeros.
 *
 * On day one every panel here is empty and every figure is 0 — which is
 * accurate and completely unhelpful. It reads as an app that is broken or one
 * that has nothing to offer, on the single occasion someone is deciding whether
 * it was worth paying for.
 *
 * The steps are ordered by dependency rather than importance: a project needs a
 * parcel, and a schedule needs a project. Following them in order is the only
 * way that works, so they are numbered rather than presented as a menu.
 *
 * It disappears on its own. Nobody has to find a dismiss button, and nothing is
 * remembered about whether it was dismissed — the work itself is the state.
 */
export function GetStarted({
  hasProperties,
  hasProjects,
  hasCrew,
}: {
  hasProperties: boolean;
  hasProjects: boolean;
  hasCrew: boolean;
}) {
  const steps: Step[] = [
    {
      href: "/development",
      label: "Add a parcel",
      hint: "Land you are assessing, before you commit to building.",
      icon: Landmark,
      done: hasProperties,
    },
    {
      href: "/projects",
      label: "Start a project",
      hint: "A parcel you have decided to build. The budget and schedule hang off it.",
      icon: HardHat,
      done: hasProjects,
    },
    {
      href: "/teams",
      label: "Invite your crew",
      hint: "Superintendents, engineers and foremen you assign work to.",
      icon: Users,
      done: hasCrew,
    },
  ];

  const complete = steps.filter((s) => s.done).length;
  // The first thing not yet done. Everything else is either finished or not
  // possible yet, so it is the only one that gets emphasis.
  const next = steps.find((s) => !s.done);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 bg-brand-700 p-6 text-white">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-200">
            Getting started
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">
            Three steps and the app fills itself in
          </h2>
        </div>
        <p className="text-sm font-medium text-brand-200 tabular-nums">
          {complete} of {steps.length} done
        </p>
      </div>

      <ol className="divide-y divide-line">
        {steps.map((step, index) => {
          const isNext = step === next;
          return (
            <li key={step.href}>
              <Link
                href={step.href}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas/60",
                  step.done && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "icon-tile size-10 shrink-0",
                    step.done
                      ? "bg-mint-100 text-status-ontrack"
                      : isNext
                        ? "bg-brand-700 text-accent-500"
                        : "bg-canvas text-ink-subtle",
                  )}
                >
                  {step.done ? <Check className="size-5" /> : <step.icon className="size-5" />}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-semibold tracking-tight">
                    <span className="text-ink-subtle tabular-nums">{index + 1}.</span>
                    {step.label}
                  </p>
                  <p className="mt-0.5 text-sm text-ink-muted">{step.hint}</p>
                </div>

                {/* Only the next step gets an arrow. Three of them would make
                    three equally likely places to go, which is not what a
                    numbered list means. */}
                {isNext && <ArrowRight className="size-4.5 shrink-0 text-brand-700" />}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
