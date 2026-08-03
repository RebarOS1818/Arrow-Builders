import { AppShell } from "@/components/layout/app-shell";
import { getCurrentProfile, getTeam } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, team] = await Promise.all([getCurrentProfile(), getTeam()]);

  const onSite = team
    .filter((member) => member.on_site_today)
    .map(({ id, full_name, initials, role }) => ({ id, full_name, initials, role }));

  return (
    <AppShell
      user={{ full_name: profile.full_name, initials: profile.initials, role: profile.role }}
      crew={onSite}
    >
      {children}
    </AppShell>
  );
}
