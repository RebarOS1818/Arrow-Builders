"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Flag, Plus } from "lucide-react";
import { WeatherIcon, type Condition } from "@/components/ui/weather";
import {
  ScheduleTaskCard,
  TaskCardPreview,
  type CrewMember,
} from "@/components/schedule/task-card";
import { SchedulePicker } from "@/components/schedule/schedule-picker";
import { CreateTaskModal, type NewTaskInput } from "@/components/schedule/create-task-modal";
import { createTask, scheduleTask } from "@/app/(app)/schedule/actions";
import { cn } from "@/lib/utils";
import { dayOfMonth, rangeLabel, spanColumns, weekDays, weekdayLabel } from "@/lib/week";
import type { Milestone, TaskWithProject } from "@/lib/types";

type MilestoneWithProject = Milestone & { project: { id: string; name: string } };

/** The backlog's droppable id. Every other droppable is a `YYYY-MM-DD`. */
const UNSCHEDULED = "unscheduled";

/**
 * A region a task can be dropped into.
 *
 * `isOver` replaces the hover state the board used to track by hand: the
 * library already knows which region the pointer is in, and a second copy of
 * that fact is one that can disagree with it.
 */
function DropZone({
  id,
  className,
  activeClassName,
  children,
}: {
  id: string;
  className: string;
  activeClassName: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn(className, isOver && activeClassName)}>
      {children}
    </div>
  );
}

export function ScheduleBoard({
  tasks,
  milestones,
  crewByTask,
  weekStart,
  today,
  weather,
  projects,
}: {
  projects: { id: string; name: string }[];
  tasks: TaskWithProject[];
  milestones: MilestoneWithProject[];
  crewByTask: Record<string, CrewMember[]>;
  weekStart: string;
  today: string;
  weather: { date: string; high: number; low: number; condition: Condition }[];
}) {
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [, startTransition] = useTransition();

  /**
   * Moves are held locally rather than in `useOptimistic`: without Supabase
   * configured there is no server write to reconcile against, and an optimistic
   * value would snap back the moment the transition settled. Once the database
   * revalidates, the override simply matches what the server already returned.
   */
  const [moves, setMoves] = useState<Record<string, string | null>>({});

  const [draggingId, setDraggingId] = useState<string | null>(null);

  /** The task whose day picker is open. */
  const [pickerId, setPickerId] = useState<string | null>(null);

  /**
   * Set for the length of one event loop turn after a drag, because the browser
   * still dispatches a click on the element the drag released over. Without it,
   * every drop would also open the picker for the task just dropped.
   */
  const justDragged = useRef(false);

  /*
   * Two sensors, one input each.
   *
   * Mouse rather than pointer, deliberately: a touch also produces pointer
   * events, so a PointerSensor claims the gesture before the TouchSensor ever
   * sees it — and then the phone gets the mouse's 8px rule, which is the first
   * 8px of every scroll. Mouse and touch as separate sensors is the pairing
   * that lets each have the activation its input actually wants.
   *
   * Mouse: 8px of travel. The card is a button as well as a draggable, and a
   * press that never moves has to stay a click that opens the picker.
   *
   * Touch: 200ms held still. Distance cannot work here — the backlog is a
   * scrolling list, and a drag that begins after 8px of downward movement makes
   * its bottom unreachable. Holding for a moment is the universal "pick up",
   * and the 6px tolerance means a slightly unsteady thumb still qualifies.
   *
   * There is deliberately no KeyboardSensor. It would claim Enter and Space to
   * start a keyboard drag, which is how the card stops being a button — and
   * what it offers in exchange is nudging a card across the grid in 25px steps
   * until it lands in the right column. The day picker those keys open instead
   * is the same operation as seven list items, so the keyboard route here is
   * better than the drag, not a fallback for it.
   */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  /** Tasks created in demo mode, where no database write can echo them back. */
  const [localTasks, setLocalTasks] = useState<TaskWithProject[]>([]);

  /**
   * The toolbar's Create Task button is a sibling component, so it opens the
   * dialog through a `?create=1` query param. That is read directly rather than
   * mirrored into state — copying it in an effect would cascade renders.
   */
  const [openedLocally, setOpenedLocally] = useState(false);
  const showCreate = openedLocally || searchParams.get("create") === "1";

  function closeCreate() {
    setOpenedLocally(false);
    if (searchParams.get("create") === "1") {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("create");
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    }
  }

  const currentTasks = useMemo(
    () =>
      [...tasks, ...localTasks].map((task) => {
        if (!(task.id in moves)) return task;
        const date = moves[task.id]!;
        return {
          ...task,
          starts_at: date,
          ends_at: date,
          status: date ? ("scheduled" as const) : ("unscheduled" as const),
        };
      }),
    [tasks, localTasks, moves],
  );

  async function handleCreate(input: NewTaskInput) {
    const result = await createTask(input);

    // A failed insert is not demo mode — surface it instead of showing a task
    // that was never saved and would vanish on refresh.
    if (!result.ok) throw new Error(result.error);

    if (!result.persisted) {
      const project = projects.find((p) => p.id === input.projectId);
      setLocalTasks((prev) => [
        ...prev,
        {
          id: `local-${crypto.randomUUID()}`,
          org_id: "local",
          project_id: input.projectId,
          title: input.title,
          trade: input.trade,
          status: input.date ? "scheduled" : "unscheduled",
          starts_at: input.date,
          ends_at: input.date,
          crew_size: input.crewSize,
          overdue: false,
          sort_order: 1000 + prev.length,
          // The board has no building picker, and a task made here belongs to
          // the project rather than to one structure on it.
          building_id: null,
          project: { id: input.projectId, name: project?.name ?? "Unknown project" },
        },
      ]);
    }
  }

  const unscheduled = currentTasks.filter((t) => !t.starts_at);
  const byDay = (day: string) => currentTasks.filter((t) => t.starts_at === day);

  function move(taskId: string, date: string | null) {
    setMoves((prev) => ({ ...prev, [taskId]: date }));
    startTransition(async () => {
      await scheduleTask(taskId, date);
    });
  }

  function onDragStart(event: DragStartEvent) {
    setDraggingId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    const taskId = String(event.active.id);
    setDraggingId(null);

    justDragged.current = true;
    // Cleared on the next turn, which is after the click the browser is about
    // to dispatch and before anything a person could do next.
    setTimeout(() => {
      justDragged.current = false;
    }, 0);

    const over = event.over?.id;
    // Released outside any zone. Dropping a task into open space is far more
    // often a change of mind than an instruction, so it stays where it was.
    if (over === undefined) return;

    move(taskId, over === UNSCHEDULED ? null : String(over));
  }

  const activeTask = draggingId ? currentTasks.find((t) => t.id === draggingId) : undefined;
  const pickerTask = pickerId ? currentTasks.find((t) => t.id === pickerId) : undefined;

  function openPicker(taskId: string) {
    if (justDragged.current) return;
    setPickerId(taskId);
  }

  return (
    <DndContext
      sensors={sensors}
      // `pointerWithin` rather than the default rectangle intersection: the day
      // columns tile the grid edge to edge, so a card overlapping two of them
      // has to resolve to the one actually under the pointer, not the one it
      // happens to overlap most.
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDraggingId(null)}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Unscheduled backlog */}
        <DropZone
          id={UNSCHEDULED}
          className="card flex max-h-[70vh] flex-col p-3 transition-colors"
          activeClassName="bg-brand-50"
        >
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold">Unscheduled ({unscheduled.length})</h2>
            <button
              type="button"
              aria-label="Add task"
              onClick={() => setOpenedLocally(true)}
              className="text-ink-subtle hover:text-ink"
            >
              <Plus className="size-4" />
            </button>
          </div>

          <div className="scroll-thin mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
            {unscheduled.map((task) => (
              <ScheduleTaskCard
                key={task.id}
                task={task}
                crew={crewByTask[task.id] ?? []}
                compact
                onOpen={openPicker}
              />
            ))}

            {unscheduled.length === 0 && (
              <p className="px-1 py-6 text-center text-xs text-ink-muted">
                Everything is scheduled.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpenedLocally(true)}
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong py-2 text-xs font-medium text-ink-muted hover:border-brand-400 hover:text-brand-700"
          >
            <Plus className="size-3.5" />
            Add Unscheduled Task
          </button>
        </DropZone>

        {/* Week grid */}
        <section className="card overflow-hidden">
          <div className="border-b border-line px-4 py-2.5">
            <p className="text-sm font-semibold">{rangeLabel(weekStart, days[6]!)}</p>
          </div>

          <div className="scroll-thin overflow-x-auto">
            <div className="min-w-[860px]">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-line">
                {days.map((day) => {
                  const forecast = weather.find((w) => w.date === day);
                  return (
                    <div
                      key={day}
                      className={cn(
                        "px-3 py-2",
                        day === today && "bg-brand-50/60",
                        day !== days[0] && "border-l border-line",
                      )}
                    >
                      <p className="text-xs font-semibold">
                        {weekdayLabel(day)}{" "}
                        <span className="text-ink-muted">{dayOfMonth(day)}</span>
                      </p>
                      {forecast && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <WeatherIcon condition={forecast.condition} className="size-3.5" />
                          <span className="text-[11px] text-ink-muted">
                            {forecast.high}°/{forecast.low}°
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Milestone band */}
              {milestones.length > 0 && (
                <div className="grid grid-cols-7 gap-y-1.5 border-b border-line px-1 py-2">
                  {milestones.map((milestone) => {
                    const span = spanColumns(milestone.starts_at, milestone.ends_at, weekStart);
                    if (!span) return null;
                    return (
                      <div
                        key={milestone.id}
                        style={{ gridColumnStart: span.start, gridColumnEnd: span.end }}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs",
                          milestone.trade === "concrete"
                            ? "bg-orange-50 text-orange-900 ring-1 ring-orange-200"
                            : "bg-brand-50 text-brand-800 ring-1 ring-brand-200",
                        )}
                      >
                        <Flag className="size-3.5 shrink-0" />
                        <span className="truncate font-medium">
                          {milestone.title} — {milestone.project.name}
                        </span>
                        <span className="ml-auto hidden shrink-0 text-[11px] opacity-70 sm:block">
                          {rangeLabel(milestone.starts_at, milestone.ends_at)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Day columns */}
              <div className="grid min-h-[380px] grid-cols-7">
                {days.map((day) => (
                  <DropZone
                    key={day}
                    id={day}
                    className={cn(
                      "space-y-2 p-2 transition-colors",
                      day !== days[0] && "border-l border-line",
                      day === today && "bg-brand-50/40",
                    )}
                    activeClassName="bg-brand-50"
                  >
                    {byDay(day).map((task) => (
                      <ScheduleTaskCard
                        key={task.id}
                        task={task}
                        crew={crewByTask[task.id] ?? []}
                        onOpen={openPicker}
                      />
                    ))}

                    {draggingId && byDay(day).length === 0 && (
                      <div className="grid h-16 place-items-center rounded-lg border border-dashed border-brand-300 text-[11px] font-medium text-brand-700">
                        Drop to schedule
                      </div>
                    )}
                  </DropZone>
                ))}
              </div>
            </div>
          </div>
        </section>

        {showCreate && (
          <CreateTaskModal
            projects={projects}
            defaultDate={null}
            onClose={closeCreate}
            onCreate={handleCreate}
          />
        )}

        {pickerTask && (
          <SchedulePicker
            task={pickerTask}
            days={days}
            today={today}
            weather={weather}
            onClose={() => setPickerId(null)}
            onPick={(date) => {
              move(pickerTask.id, date);
              setPickerId(null);
            }}
          />
        )}
      </div>

      {/* The card that follows the pointer. Rendered outside the board so it
          is not clipped by the week grid's horizontal scroll — a preview that
          disappears at the edge of the container it came from is worse than
          none. */}
      <DragOverlay dropAnimation={null}>
        {activeTask && (
          <TaskCardPreview
            task={activeTask}
            crew={crewByTask[activeTask.id] ?? []}
            compact={!activeTask.starts_at}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
