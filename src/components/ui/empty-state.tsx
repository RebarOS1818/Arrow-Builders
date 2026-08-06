import { cn } from "@/lib/utils";

/**
 * The three ways a list can be empty. They are not the same problem and must
 * not look the same.
 *
 * `start` — nothing has ever been here. This is what a new organization meets
 *   on every screen, so it has to orient and then offer the one action that
 *   ends it. A grey sentence is a dead end on the day someone is deciding
 *   whether this app is worth using.
 *
 * `filtered` — there is data, the filter just excluded it. Offering "add your
 *   first" here is wrong twice: they already have some, and the fix is to widen
 *   the filter, not to create something.
 *
 * `clear` — empty because the work is done. Nothing awaiting approval is good
 *   news, and dressing it up as a problem to solve trains people to ignore it.
 *   Deliberately the quietest of the three.
 */
export function EmptyState({
  variant = "start",
  icon: Icon,
  title,
  children,
  action,
  className,
}: {
  variant?: "start" | "filtered" | "clear";
  icon?: React.ElementType;
  title: string;
  /** One line. If it needs two, the screen is explaining too much. */
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  if (variant === "clear") {
    return (
      <div className={cn("flex flex-col items-center gap-1.5 px-6 py-10 text-center", className)}>
        {Icon && (
          <span className="icon-tile size-9 bg-mint-50 text-status-ontrack">
            <Icon className="size-4.5" />
          </span>
        )}
        <p className="text-sm font-medium text-ink-muted">{title}</p>
        {children && <p className="max-w-sm text-sm text-ink-subtle">{children}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-6 py-12 text-center",
        // Dashed for `start`: an outline that reads as a space waiting to be
        // filled rather than a panel that failed to load.
        variant === "start" && "rounded-card border border-dashed border-line-strong",
        className,
      )}
    >
      {Icon && (
        <span className="icon-tile size-11 bg-canvas text-ink-subtle">
          <Icon className="size-5" />
        </span>
      )}
      <h3 className="mt-1 font-semibold tracking-tight">{title}</h3>
      {children && <p className="max-w-sm text-sm text-ink-muted">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
