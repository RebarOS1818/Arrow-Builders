import Link from "next/link";
import { ArrowRight, Check, FileSignature, HardHat, Layers, Users } from "lucide-react";
import { NewBidPackageForm, NewContractForm, NewSubcontractorForm } from "@/components/phases/forms";
import { cn } from "@/lib/utils";

type Option = { value: string; label: string };

/**
 * What Construction shows before any of it exists.
 *
 * The page is four sections that each depend on the one below: a change order
 * adjusts a contract, a contract goes to a subcontractor on a project, a quote
 * answers a bid package. Empty, that dependency turned into four disabled
 * buttons and three lines of grey text explaining what was missing — which
 * reads as four things that are broken rather than one thing to do first, and
 * the order to do them in was the reverse of the order they were listed.
 *
 * So the empty page is the order itself. Only the next possible step is live;
 * the ones after it are not offered, because offering a control that cannot
 * work is the thing that made the old page feel broken.
 *
 * It disappears on its own once the work exists. Nothing is remembered about
 * whether it was dismissed — the records are the state.
 */
export function ConstructionSetup({
  hasProjects,
  hasSubs,
  hasPackages,
  projects,
  subcontractors,
}: {
  hasProjects: boolean;
  hasSubs: boolean;
  hasPackages: boolean;
  projects: Option[];
  subcontractors: Option[];
}) {
  const steps = [
    {
      key: "project",
      icon: HardHat,
      label: "Create a project",
      hint: "Everything here is committed against a job. Without one there is nothing to commit to.",
      done: hasProjects,
      action: (
        <Link
          href="/projects"
          className="pressable inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Go to Projects
          <ArrowRight className="size-4" />
        </Link>
      ),
    },
    {
      key: "sub",
      icon: Users,
      label: "Add a subcontractor",
      hint: "The companies you award work to. Insurance expiry is tracked here and warned about before it lapses.",
      done: hasSubs,
      action: <NewSubcontractorForm />,
    },
    {
      key: "package",
      icon: Layers,
      label: "Put out a bid package",
      hint: "A scope you want priced. Quotes come back against it and are compared side by side.",
      done: hasPackages,
      action: <NewBidPackageForm projects={projects} />,
    },
    {
      key: "contract",
      icon: FileSignature,
      label: "Award a contract",
      hint: "The committed figure. Change orders adjust it, and the current value is computed rather than typed.",
      done: false,
      action: <NewContractForm projects={projects} subcontractors={subcontractors} />,
    },
  ];

  // The first thing not yet done. Everything after it is not possible yet, so
  // it is the only one that gets its action.
  const next = steps.find((s) => !s.done);

  return (
    <section className="card overflow-hidden">
      <div className="bg-brand-700 p-6 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-200">
          Getting started
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">
          Four steps, in this order
        </h2>
        <p className="mt-1.5 max-w-xl text-sm text-brand-200">
          Each one needs the one before it. A contract cannot exist without a
          project and a company to award it to.
        </p>
      </div>

      <ol className="divide-y divide-line">
        {steps.map((step, index) => {
          const isNext = step === next;
          return (
            <li
              key={step.key}
              className={cn(
                "flex flex-wrap items-center gap-4 px-5 py-4",
                step.done && "opacity-60",
                // Not yet reachable. Dimmed rather than hidden, because the
                // point of the list is seeing where this is going.
                !step.done && !isNext && "opacity-45",
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

              <div className="min-w-48 flex-1">
                <p className="flex items-center gap-2 font-semibold tracking-tight">
                  <span className="text-ink-subtle tabular-nums">{index + 1}.</span>
                  {step.label}
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">{step.hint}</p>
              </div>

              {/* Only the next step is actionable. The others would be disabled
                  buttons, which is what this replaced. */}
              {isNext && <div className="shrink-0">{step.action}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
