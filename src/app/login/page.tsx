import Link from "next/link";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* The full lockup, not the mark: this is the one screen with room for
            it, and the only one where someone may not yet know whose app they
            are signing into.

            On a plate rather than bare. The supplied artwork is a JPEG with an
            opaque white background — JPEG has no transparency — so against the
            tinted page it reads as a hard white rectangle around the logo.
            Giving it a rounded white card with real padding turns that
            background into something deliberate instead of a mistake.

            The file is cropped to the bounds its own clip path declares — the
            original is a 720x720 square with the lockup floating in the middle,
            which would make the plate several times taller than the logo. */}
        <div className="mb-6 flex justify-center">
          <span className="inline-flex rounded-card bg-white px-7 py-5 shadow-soft">
            <Image
              src="/logo-light.svg"
              alt="Arrow Upscale Builders"
              width={506}
              height={318}
              priority
              className="h-auto w-40"
            />
          </span>
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
