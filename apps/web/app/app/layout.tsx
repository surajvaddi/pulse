import Link from "next/link";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Bell,
  Bot,
  CalendarDays,
  Clock3,
  Cable,
  Gauge,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  ReceiptText,
  ShieldAlert,
  Users
} from "lucide-react";

import { startDemoSessionAction } from "@/app/account-actions";
import { apiGet, demoAuthEnabled, demoUsers, type DemoUserId, type SessionSummary } from "@/lib/api";
import {
  navigationForSession,
  primaryMobileNavigation,
  type NavigationIconKey,
  type NavigationItem
} from "@/lib/navigation";

const navIcons: Record<NavigationIconKey, typeof Home> = {
  bell: Bell,
  bot: Bot,
  calendar: CalendarDays,
  clock: Clock3,
  cable: Cable,
  gauge: Gauge,
  home: Home,
  dashboard: LayoutDashboard,
  list: ListChecks,
  receipt: ReceiptText,
  shield: ShieldAlert,
  users: Users
};

function NavLink({ item, className }: { item: NavigationItem; className: string }) {
  const Icon = navIcons[item.icon];
  return (
    <Link href={item.href} className={className}>
      <Icon size={18} aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const hasSupabaseSession = Boolean(cookieStore.get("ps_access_token")?.value);
  if (!demoAuthEnabled && !hasSupabaseSession) {
    redirect("/login");
  }
  const session = await apiGet<SessionSummary>("/auth/me");
  const navItems = navigationForSession(session);
  const mobileNavItems = primaryMobileNavigation(navItems);
  const currentDemoUserId = (cookieStore.get("ps_demo_user_id")?.value ?? session.userId) as DemoUserId;

  return (
    <div className="app-shell">
      <Link href="#main-content" className="skip-link">
        Skip to main content
      </Link>
      <aside className="sidebar" aria-label="Primary navigation">
        <Link href="/app/home" className="brand">
          PulseShift
        </Link>
        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink key={item.href} item={item} className="nav-link" />
          ))}
        </nav>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="switchers">
            <select aria-label="Facility">
              <option>Mercy Main Hospital</option>
              <option>Mercy North Clinic</option>
            </select>
            <select aria-label="Unit">
              <option>ICU</option>
              <option>Emergency Department</option>
              <option>Med-Surg</option>
            </select>
          </div>
          <div className="profile-strip">
            <Link className="icon-button" aria-label="Notifications" href="/app/notifications">
              <Bell size={18} />
            </Link>
            <Link className="icon-button" aria-label="Sign out" href="/logout">
              <LogOut size={18} />
            </Link>
            <div className="session-summary" aria-label="Current account">
              <strong>{session.displayName}</strong>
              <span>{session.role.replaceAll("_", " ").toLowerCase()}</span>
            </div>
            {demoAuthEnabled ? (
              <form className="demo-switcher" action={startDemoSessionAction}>
                <select aria-label="Demo user" name="userId" defaultValue={currentDemoUserId}>
                  {demoUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.label} - {user.role}
                    </option>
                  ))}
                </select>
                <button className="command-button" type="submit">
                  Switch
                </button>
              </form>
            ) : null}
          </div>
        </header>

        <main className="content" id="main-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileNavItems.map((item) => (
          <NavLink key={item.href} item={item} className="mobile-link" />
        ))}
      </nav>
    </div>
  );
}
