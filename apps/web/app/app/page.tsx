import { redirect } from "next/navigation";

import { apiGet, type SessionSummary } from "@/lib/api";
import { defaultLandingRoute } from "@/lib/landing-route";

export default async function AppIndexPage() {
  const session = await apiGet<SessionSummary>("/auth/me");
  redirect(defaultLandingRoute(session));
}
