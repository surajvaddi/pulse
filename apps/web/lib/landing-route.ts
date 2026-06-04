import type { AccountRole } from "@pulseshift/domain";

import type { AppRoute } from "@/lib/page-contracts";
import { navigationForSession, sessionCanOpenRoute, type SessionAccess } from "@/lib/navigation";

const roleLandingRoutes: Partial<Record<AccountRole, AppRoute>> = {
  EMPLOYEE: "/app/home",
  EXTERNAL_AGENCY_ADMIN: "/app/home",
  CHARGE_NURSE: "/app/manager",
  FLOAT_POOL_COORDINATOR: "/app/manager",
  UNIT_MANAGER: "/app/manager",
  PAYROLL_ADMIN: "/app/timecards",
  CREDENTIALING_ADMIN: "/app/admin/credentials",
  COMPLIANCE_AUDITOR: "/app/admin/audit",
  EXECUTIVE_VIEWER: "/app/admin/audit",
  ORGANIZATION_OWNER: "/app/admin/users",
  SYSTEM_ADMIN: "/app/admin/users",
  WORKFORCE_ADMIN: "/app/admin/users",
  AI_AGENT_SERVICE: "/app/copilot"
};

export function defaultLandingRoute(session: SessionAccess): AppRoute {
  const preferredRoute = roleLandingRoutes[session.role as AccountRole];
  if (preferredRoute && sessionCanOpenRoute(session, preferredRoute)) {
    return preferredRoute;
  }

  const firstVisibleRoute = navigationForSession(session).at(0)?.href;
  return firstVisibleRoute ?? "/app/home";
}
