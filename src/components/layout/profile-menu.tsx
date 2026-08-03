"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Settings, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * The account menu behind the avatar.
 *
 * Settings used to be a gear sitting beside the avatar — two controls for one
 * idea, and the gear was hidden below `sm`, so on a phone there was no way to
 * reach settings at all except by knowing the URL. Folding it into the avatar
 * gives one obvious place for anything to do with "me".
 */
export function ProfileMenu({
  name,
  initials,
  role,
}: {
  name: string;
  initials: string;
  role: string;
}) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      // Focus goes back to the avatar rather than to the top of the page.
      triggerRef.current?.focus();
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  async function signOut() {
    if (!isSupabaseConfigured) return;
    setSigningOut(true);
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className="pressable rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <Avatar name={name} initials={initials} size="lg" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-tile bg-surface p-1.5 shadow-material"
        >
          {/* Who you are signed in as. On a shared site tablet this is the
              question the menu most often gets opened to answer. */}
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <Avatar name={name} initials={initials} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{name}</span>
              <span className="block truncate text-xs text-ink-subtle">{role}</span>
            </span>
          </div>

          <div className="my-1 h-px bg-line" />

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm font-medium text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <UserRound className="size-4" />
            Your profile
          </Link>

          <Link
            href="/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm font-medium text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <Settings className="size-4" />
            Settings
          </Link>

          {isSupabaseConfigured && (
            <>
              <div className="my-1 h-px bg-line" />
              <button
                type="button"
                role="menuitem"
                onClick={signOut}
                disabled={signingOut}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-sm font-medium text-ink-muted hover:bg-canvas hover:text-ink disabled:opacity-60"
              >
                <LogOut className="size-4" />
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
