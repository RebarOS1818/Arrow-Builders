"use client";

import { useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";

type CrewMember = { id: string; full_name: string; initials: string; role: string };

/**
 * Owns the mobile navigation state. Below `lg` the sidebar is a slide-over
 * drawer; from `lg` up it is a static column and `open` is irrelevant.
 */
export function AppShell({
  user,
  crew,
  children,
}: {
  user: { full_name: string; initials: string };
  crew: CrewMember[];
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    // Stop the page behind the drawer scrolling under the finger.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="flex min-h-screen">
      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm lg:hidden"
        />
      )}

      <Sidebar crew={crew} open={open} onClose={() => setOpen(false)} />

      <div className="min-w-0 flex-1 px-4 py-5 sm:px-6">
        <AppHeader
          user={user}
          onMenu={() => setOpen(true)}
          menuButtonRef={triggerRef}
          menuOpen={open}
        />
        <main className="pb-10">{children}</main>
      </div>
    </div>
  );
}
