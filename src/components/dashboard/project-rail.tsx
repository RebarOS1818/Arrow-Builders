"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProjectCard } from "@/components/projects/project-card";
import type { Project } from "@/lib/types";

type Lead = { full_name: string; initials: string; role: string };

/** Horizontal card rail with arrow paging, matching the reference layout. */
export function ProjectRail({
  title,
  projects,
  leads,
  viewAllHref,
}: {
  title: string;
  projects: Project[];
  leads: Record<string, Lead>;
  viewAllHref: string;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  // An arrow that scrolls nothing because the rail is already at its end reads
  // as a broken button. Both are disabled at the edges instead, and when every
  // card fits on screen both stay disabled.
  useEffect(() => {
    const node = rail.current;
    if (!node) return;

    function measure() {
      if (!node) return;
      const max = node.scrollWidth - node.clientWidth;
      // A pixel of slack: fractional scroll positions never land exactly on 0
      // or on the maximum.
      setAtStart(node.scrollLeft <= 1);
      setAtEnd(node.scrollLeft >= max - 1);
    }

    measure();
    node.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);

    return () => {
      node.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [projects.length]);

  function page(direction: -1 | 1) {
    const node = rail.current;
    if (!node) return;
    // Scroll by one card plus its gap so cards stay aligned to the rail edge.
    const card = node.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : node.clientWidth * 0.8;
    node.scrollBy({ left: step * direction, behavior: "smooth" });
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <div className="flex items-center gap-2">
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-brand-700 hover:underline"
          >
            See all
          </Link>
          <button
            type="button"
            onClick={() => page(-1)}
            disabled={atStart}
            aria-label="Previous projects"
            className="grid size-8 place-items-center rounded-full bg-surface text-ink-muted shadow-soft transition-opacity hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => page(1)}
            disabled={atEnd}
            aria-label="Next projects"
            className="grid size-8 place-items-center rounded-full bg-brand-600 text-white shadow-soft transition-opacity hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div
        ref={rail}
        className="scroll-hidden mt-3.5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1"
      >
        {projects.map((project) => (
          <div key={project.id} className="w-[266px] shrink-0 snap-start">
            <ProjectCard project={project} lead={leads[project.id]} />
          </div>
        ))}
      </div>
    </section>
  );
}
