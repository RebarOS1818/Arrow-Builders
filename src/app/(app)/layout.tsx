import { TopNav } from "@/components/layout/top-nav";
import { getCurrentProfile } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen">
      <TopNav user={{ full_name: profile.full_name, initials: profile.initials }} />
      <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-6">{children}</main>
    </div>
  );
}
