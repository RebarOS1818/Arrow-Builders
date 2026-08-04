import {
  CalendarDays,
  FileText,
  Hammer,
  HardHat,
  Landmark,
  LayoutDashboard,
  ListChecks,
  PieChart,
  Settings,
  Stamp,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

/**
 * The destinations, in one place.
 *
 * The rail and the mobile drawer are different components because they behave
 * differently, but a link that exists in one and not the other is a page you
 * can only reach on a laptop. Sharing the list is what stops that happening
 * the next time one is edited.
 *
 * Grouped rather than listed flat: ten items in a single column is a wall, and
 * the two groups answer different questions — "where is the work" and "how is
 * the account set up".
 */
export const WORK: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/development", label: "Development", icon: Landmark },
  { href: "/construction", label: "Construction", icon: Hammer },
  { href: "/projects", label: "Projects", icon: HardHat },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/approvals", label: "Approvals", icon: Stamp },
  { href: "/reports", label: "Reports", icon: PieChart },
  { href: "/teams", label: "Teams", icon: Users },
];

export const ACCOUNT: NavItem[] = [
  { href: "/billing", label: "Billing", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

/**
 * Dashboard is an exact match; everything else matches its subtree, so a parcel
 * detail page still shows Development as where you are.
 */
export function isActiveHref(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}
