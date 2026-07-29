import Link from "next/link";
import { HardHat } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-700 text-white">
            <HardHat className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">Arrow Builders</span>
        </div>

        <div className="card p-6">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Use your work email to access your project portfolio.
          </p>

          {isSupabaseConfigured ? (
            <LoginForm />
          ) : (
            <div className="mt-5 space-y-3 text-sm">
              <p className="rounded-lg bg-canvas p-3 text-ink-muted">
                Supabase is not configured yet, so the app is running on its bundled demo data.
                Add <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable
                sign-in.
              </p>
              <Link
                href="/"
                className="block rounded-lg bg-brand-700 px-4 py-2.5 text-center font-semibold text-white hover:bg-brand-800"
              >
                Continue to demo
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
