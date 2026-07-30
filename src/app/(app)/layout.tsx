import { AppHeader } from "@/components/layout/app-header";
import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentProfile, getTeam } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [profile, team] = await Promise.all([getCurrentProfile(), getTeam()]);

  const onSite = team
    .filter((member) => member.on_site_today)
    .map(({ id, full_name, initials, role }) => ({ id, full_name, initials, role }));

  return (
    <div className="flex min-h-screen">
      <Sidebar crew={onSite} />
      <div className="min-w-0 flex-1 px-4 py-5 sm:px-6">
        <AppHeader user={{ full_name: profile.full_name, initials: profile.initials }} />
        <main className="pb-10">{children}</main>
      </div>
    </div>
  );
}
