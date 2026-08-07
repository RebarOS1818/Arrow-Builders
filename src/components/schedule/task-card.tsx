"use client";

import { useDraggable } from "@dnd-kit/core";
import { Users } from "lucide-react";
import { AvatarStack } from "@/components/ui/avatar";
import { TRADE_BLOCK } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskWithProject } from "@/lib/types";

export type CrewMember = { id: string; full_name: string; initials: string };

/**
 * The card itself, with no behaviour attached.
 *
 * Split out because the drag overlay renders the same card following the
 * finger, and that copy must not be draggable — nesting a draggable inside a
 * drag would register a second one mid-gesture.
 */
function CardBody({
  task,
  crew,
  compact,
}: {
  task: TaskWithProject;
  crew: CrewMember[];
  compact?: boolean;
}) {
  return (
    <>
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
    </>
  );
}

/** Shared between the real card and the one that follows the pointer. */
const cardClass = (task: TaskWithProject) =>
  cn(
    // Tile radius, not the full card radius: the trade edge reads as a
    // straight marker rather than a curved sliver at this size.
    "w-full rounded-tile border-l-[3px] p-2.5 text-left transition",
    TRADE_BLOCK[task.trade],
    task.overdue && "ring-1 ring-status-behind/40",
  );

/**
 * A task on the board.
 *
 * It is a button as well as a draggable, and both are the point. Dragging is
 * the fast path with a mouse; tapping opens the day picker, which is the only
 * path that works one-handed on a phone and the only one a keyboard can take at
 * all. The drag sensors are configured so the two never fire together — a press
 * that travels less than 8px stays a click.
 */
export function ScheduleTaskCard({
  task,
  crew,
  compact,
  onOpen,
}: {
  task: TaskWithProject;
  crew: CrewMember[];
  compact?: boolean;
  onOpen: (taskId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });

  return (
    <button
      type="button"
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(task.id)}
      aria-label={`${task.title}, ${task.project.name}. Schedule or move.`}
      className={cn(
        cardClass(task),
        "cursor-grab active:cursor-grabbing",
        // The original stays in place at low opacity while the overlay copy
        // travels, so the space it would return to is still visible.
        isDragging ? "opacity-40" : "hover:shadow-soft",
      )}
    >
      <CardBody task={task} crew={crew} compact={compact} />
    </button>
  );
}

/**
 * The copy that follows the pointer.
 *
 * Lifted and tilted very slightly: enough to read as picked up rather than as a
 * duplicate that appeared, which is the whole job of a drag preview on a touch
 * screen where there is no cursor to explain what is happening.
 */
export function TaskCardPreview({
  task,
  crew,
  compact,
}: {
  task: TaskWithProject;
  crew: CrewMember[];
  compact?: boolean;
}) {
  return (
    <div className={cn(cardClass(task), "rotate-2 cursor-grabbing shadow-lift")}>
      <CardBody task={task} crew={crew} compact={compact} />
    </div>
  );
}
