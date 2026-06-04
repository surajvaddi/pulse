import {
  pageContracts,
  type AppRoute,
  type PageInteractionContract
} from "@/lib/page-contracts";
import type { AccountRole, Permission } from "@pulseshift/domain";

export type NavigationIconKey =
  | "bell"
  | "bot"
  | "calendar"
  | "clock"
  | "cable"
  | "gauge"
  | "home"
  | "dashboard"
  | "list"
  | "receipt"
  | "shield"
  | "users";

export type NavigationItem = {
  href: AppRoute;
  label: string;
  icon: NavigationIconKey;
  section: "work" | "admin" | "assist";
  contract: PageInteractionContract;
};

export type SessionAccess = {
  role: AccountRole | string;
  permissions: string[];
};

const navigationCatalog: Array<Omit<NavigationItem, "label" | "contract">> = [
  { href: "/app/home", icon: "home", section: "work" },
  { href: "/app/schedule", icon: "calendar", section: "work" },
  { href: "/app/open-shifts", icon: "clock", section: "work" },
  { href: "/app/swaps", icon: "users", section: "work" },
  { href: "/app/timecards", icon: "receipt", section: "work" },
  { href: "/app/staffing-gaps", icon: "shield", section: "work" },
  { href: "/app/staff", icon: "users", section: "work" },
  { href: "/app/manager", icon: "dashboard", section: "work" },
  { href: "/app/admin", icon: "dashboard", section: "admin" },
  { href: "/app/admin/audit", icon: "list", section: "admin" },
  { href: "/app/admin/users", icon: "users", section: "admin" },
  { href: "/app/admin/facilities", icon: "dashboard", section: "admin" },
  { href: "/app/admin/units", icon: "calendar", section: "admin" },
  { href: "/app/admin/roles", icon: "shield", section: "admin" },
  { href: "/app/admin/invitations", icon: "bell", section: "admin" },
  { href: "/app/admin/integrations", icon: "cable", section: "admin" },
  { href: "/app/admin/evals", icon: "gauge", section: "admin" },
  { href: "/app/copilot", icon: "bot", section: "assist" }
];

const permissionScopeRank: Record<string, number> = {
  self: 1,
  unit: 2,
  org: 3,
  global: 4
};

function permissionSatisfies(required: Permission, granted: string) {
  if (required === granted) {
    return true;
  }

  const [requiredResource, requiredAction, requiredScope] = required.split(":");
  const [grantedResource, grantedAction, grantedScope] = granted.split(":");

  if (requiredResource !== grantedResource || requiredAction !== grantedAction) {
    return false;
  }

  const requiredRank = permissionScopeRank[requiredScope ?? ""];
  const grantedRank = permissionScopeRank[grantedScope ?? ""];
  return Boolean(requiredRank && grantedRank && grantedRank >= requiredRank);
}

export function sessionCanOpenRoute(session: SessionAccess, route: AppRoute) {
  const contract = pageContracts[route];
  const role = session.role as AccountRole;
  if (!contract.allowedRoles.includes(role)) {
    return false;
  }
  return contract.requiredPermissions.every((required) =>
    session.permissions.some((granted) => permissionSatisfies(required, granted))
  );
}

export function navigationForSession(session: SessionAccess): NavigationItem[] {
  return navigationCatalog
    .filter((item) => sessionCanOpenRoute(session, item.href))
    .map((item) => {
      const contract = pageContracts[item.href];
      return {
        ...item,
        label: contract.label,
        contract
      };
    });
}

export function primaryMobileNavigation(items: NavigationItem[]) {
  const preferredRoutes: AppRoute[] = [
    "/app/home",
    "/app/schedule",
    "/app/timecards",
    "/app/manager",
    "/app/admin/users",
    "/app/copilot"
  ];
  return preferredRoutes
    .map((route) => items.find((item) => item.href === route))
    .filter((item): item is NavigationItem => Boolean(item))
    .slice(0, 5);
}
