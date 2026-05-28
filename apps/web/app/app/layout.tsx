import Link from "next/link";
import type { ReactNode } from "react";
import {
  Bell,
  Bot,
  CalendarDays,
  Clock3,
  Cable,
  Home,
  LayoutDashboard,
  ReceiptText,
  ShieldAlert,
  Users
} from "lucide-react";

import { demoUsers } from "@/lib/api";

const navItems = [
  { href: "/app/home", label: "Home", icon: Home },
  { href: "/app/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/app/open-shifts", label: "Open Shifts", icon: Clock3 },
  { href: "/app/swaps", label: "Swaps", icon: Users },
  { href: "/app/timecards", label: "Timecards", icon: ReceiptText },
  { href: "/app/staffing-gaps", label: "Staffing", icon: ShieldAlert },
  { href: "/app/staff", label: "Staff", icon: Users },
  { href: "/app/manager", label: "Manager", icon: LayoutDashboard },
  { href: "/app/admin/integrations", label: "Integrations", icon: Cable },
  { href: "/app/copilot", label: "Copilot", icon: Bot }
];

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <Link href="/app/home" className="brand">
          PulseShift
        </Link>
        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="nav-link">
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
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
            <select aria-label="Demo user" defaultValue="user_priya">
              {demoUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label} - {user.role}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="content">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="mobile-link">
              <Icon size={19} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
