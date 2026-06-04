import type { AccountRole } from "@pulseshift/domain";

import type { AppRoute } from "@/lib/page-contracts";

export type RoleDashboardCard = {
  title: string;
  value: string;
  detail: string;
  href: AppRoute;
};

export type RoleDashboardModel = {
  eyebrow: string;
  title: string;
  summary: string;
  cards: RoleDashboardCard[];
};

const fallback: RoleDashboardModel = {
  eyebrow: "Workspace",
  title: "PulseShift workspace",
  summary: "Open the pages available to this account from the navigation.",
  cards: [
    {
      title: "Copilot",
      value: "Available",
      detail: "Ask scoped workforce questions",
      href: "/app/copilot"
    }
  ]
};

export function buildRoleDashboard(role: AccountRole | string): RoleDashboardModel {
  switch (role as AccountRole) {
    case "UNIT_MANAGER":
      return {
        eyebrow: "Unit Manager",
        title: "Unit operations dashboard",
        summary: "Review unit coverage, approvals, staffing gaps, and staff context.",
        cards: [
          { title: "Coverage", value: "Unit board", detail: "Open staffing and shift risk", href: "/app/manager" },
          { title: "Staffing", value: "Gaps", detail: "Review candidates and severity", href: "/app/staffing-gaps" },
          { title: "Swaps", value: "Approvals", detail: "Approve or deny scoped swaps", href: "/app/swaps" }
        ]
      };
    case "CHARGE_NURSE":
      return {
        eyebrow: "Charge Nurse",
        title: "Near-term unit coverage",
        summary: "Scan the unit board, staffing gaps, and team context for the current shift window.",
        cards: [
          { title: "Unit board", value: "Today", detail: "Current ICU and ED coverage", href: "/app/manager" },
          { title: "Staffing risk", value: "Scoped", detail: "See gaps and candidates", href: "/app/staffing-gaps" },
          { title: "Notifications", value: "Unit", detail: "Coverage messages", href: "/app/notifications" }
        ]
      };
    case "FLOAT_POOL_COORDINATOR":
      return {
        eyebrow: "Float Pool",
        title: "Facility staffing coordination",
        summary: "Review staffing gaps, candidate eligibility, credentials, and assignable shifts.",
        cards: [
          { title: "Staffing gaps", value: "Facility", detail: "Ranked candidate lists", href: "/app/staffing-gaps" },
          { title: "Staff directory", value: "Float pool", detail: "Availability and credentials", href: "/app/staff" },
          { title: "Schedule", value: "Facility", detail: "Visible assignment board", href: "/app/schedule" }
        ]
      };
    case "WORKFORCE_ADMIN":
      return {
        eyebrow: "Workforce Admin",
        title: "Facility workforce planning",
        summary: "Plan schedules, monitor staffing risk, and coordinate facility-level operations.",
        cards: [
          { title: "Schedule", value: "Planner", detail: "Facility schedule visibility", href: "/app/schedule" },
          { title: "Staffing", value: "Risk", detail: "Coverage gaps and candidates", href: "/app/staffing-gaps" },
          { title: "Notifications", value: "Facility", detail: "Broadcast-ready context", href: "/app/notifications" }
        ]
      };
    case "PAYROLL_ADMIN":
      return {
        eyebrow: "Payroll",
        title: "Payroll review workspace",
        summary: "Resolve timecard exceptions and prepare payroll-adjacent exports without schedule mutation.",
        cards: [
          { title: "Timecards", value: "Exceptions", detail: "Resolve scoped exceptions", href: "/app/timecards" },
          { title: "Notifications", value: "Queue", detail: "Payroll exception messages", href: "/app/notifications" },
          { title: "Copilot", value: "Read-only", detail: "Ask payroll workflow questions", href: "/app/copilot" }
        ]
      };
    case "CREDENTIALING_ADMIN":
      return {
        eyebrow: "Credentialing",
        title: "Credential review workspace",
        summary: "Review expiring credentials, verification status, and credential-related audit context.",
        cards: [
          { title: "Credentials", value: "Warnings", detail: "Expiring and missing records", href: "/app/admin/credentials" },
          { title: "Notifications", value: "Reviews", detail: "Credential workflow messages", href: "/app/notifications" },
          { title: "Copilot", value: "Guidance", detail: "Ask credential questions", href: "/app/copilot" }
        ]
      };
    case "COMPLIANCE_AUDITOR":
      return {
        eyebrow: "Compliance",
        title: "Audit review workspace",
        summary: "Review audit logs, AI tool calls, policy decisions, and access evidence.",
        cards: [
          { title: "Audit", value: "Read-only", detail: "Workflow and admin events", href: "/app/admin/audit" },
          { title: "Notifications", value: "Review", detail: "Audit review reminders", href: "/app/notifications" },
          { title: "Copilot", value: "Read-only", detail: "Ask audit questions", href: "/app/copilot" }
        ]
      };
    case "EXECUTIVE_VIEWER":
      return {
        eyebrow: "Executive",
        title: "Workforce summary",
        summary: "View facility-level schedule, staffing, risk, and operational summaries without mutation.",
        cards: [
          { title: "Schedule", value: "Summary", detail: "Facility-level schedule view", href: "/app/schedule" },
          { title: "Staffing", value: "Risk", detail: "Coverage and open-shift trends", href: "/app/staffing-gaps" },
          { title: "Copilot", value: "Read-only", detail: "Ask operational questions", href: "/app/copilot" }
        ]
      };
    case "ORGANIZATION_OWNER":
    case "SYSTEM_ADMIN":
      return {
        eyebrow: role === "ORGANIZATION_OWNER" ? "Owner" : "System Admin",
        title: "Organization control center",
        summary: "Manage users, facilities, units, integrations, audit, evals, and organization health.",
        cards: [
          { title: "Admin", value: "Overview", detail: "System health and workflows", href: "/app/admin" },
          { title: "Users", value: "Accounts", detail: "Roles and status", href: "/app/admin/users" },
          { title: "Integrations", value: "Sync", detail: "Connection health", href: "/app/admin/integrations" }
        ]
      };
    default:
      return fallback;
  }
}
