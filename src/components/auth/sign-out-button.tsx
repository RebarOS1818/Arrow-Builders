"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="pressable flex items-center gap-1.5 rounded-full bg-surface px-4 py-2.5 text-sm font-medium text-ink-muted shadow-soft hover:text-ink"
    >
      <LogOut className="size-4" />
      Sign out
    </button>
  );
}
