import { CheckCircle2, CircleDashed } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getCurrentProfile, getOrganization } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [profile, org] = await Promise.all([getCurrentProfile(), getOrganization()]);

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <section className="card p-5">
        <h2 className="font-semibold tracking-tight">Profile</h2>
        <div className="mt-4 flex items-center gap-4">
          <Avatar name={profile.full_name} initials={profile.initials} size="lg" />
          <div>
            <p className="font-medium">{profile.full_name}</p>
            <p className="text-sm text-ink-muted">{profile.role}</p>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold tracking-tight">Organization</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row label="Name" value={org.name} />
          <Row label="Slug" value={org.slug} />
        </dl>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold tracking-tight">Data source</h2>
        <div className="mt-3 flex items-start gap-2.5 text-sm">
          {isSupabaseConfigured ? (
            <>
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-600" />
              <p>
                Connected to Supabase. All reads and writes go to your project database under row
                level security.
              </p>
            </>
          ) : (
            <>
              <CircleDashed className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
              <div>
                <p>Running on bundled demo data.</p>
                <p className="mt-1 text-ink-muted">
                  Set <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                  <code className="font-mono text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then run
                  the migration and seed in <code className="font-mono text-xs">supabase/</code>.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {isSupabaseConfigured && <SignOutButton />}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
