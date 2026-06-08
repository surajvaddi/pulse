import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionCookieNames } from "@pulseshift/tools";

export async function readSupabaseAccessToken(): Promise<string | undefined> {
  return (await cookies()).get(sessionCookieNames.accessToken)?.value;
}

export async function requireSupabaseAccessToken(loginPath = "/login"): Promise<string> {
  const accessToken = await readSupabaseAccessToken();
  if (!accessToken) {
    redirect(loginPath);
  }
  return accessToken;
}
