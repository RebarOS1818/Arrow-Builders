"use client";

import { Users } from "lucide-react";
import { AvatarStack } from "@/components/ui/avatar";
import { TRADE_ACCENT } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskWithProject } from "@/lib/types";

export type CrewMember = { id: string; full_name: string; initials: string };

export function ScheduleTaskCard({
  task,
  crew,
  compact,
  dragging,
  ...handlers
}: {
  task: TaskWithProject;
  crew: CrewMember[];
  compact?: boolean;
  dragging?: boolean;
} & Pick<React.HTMLAttributes<HTMLDivElement>, "onDragStart" | "onDragEnd">) {
  return (
    <div
      draggable
      {...handlers}
      className={cn(
        // Tile radius, not the full card radius: the trade accent stripe reads as
        // a straight edge marker rather than a curved sliver at this size.
        "cursor-grab rounded-tile border-l-[3px] bg-surface p-2.5 shadow-soft transition active:cursor-grabbing",
        TRADE_ACCENT[task.trade],
        dragging ? "opacity-40" : "hover:shadow-lift",
        task.overdue && "ring-1 ring-status-behind/40",
      )}
    >
      <p className="text-[13px] font-semibold leading-tight">{task.title}</p>
      <p className="mt-0.5 truncate text-[11px] text-ink-muted">{task.project.name}</p>

      <div className="mt-2">
        {compact ? (
          <span className="flex items-center gap-1 text-[11px] font-medium text-ink-muted">
            <Users className="size-3.5" />
            {task.crew_size}
          </span>
        ) : (
          <AvatarStack people={crew} max={2} size="xs" />
        )}
      </div>
    </div>
  );
}
