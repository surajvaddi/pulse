export type ToolRiskLevel = "READ_ONLY" | "LOW_RISK_WRITE" | "APPROVAL_REQUIRED" | "BLOCKED";

export type ToolDefinition = {
  name: string;
  riskLevel: ToolRiskLevel;
  requiredPermissions: string[];
};

export const initialToolRegistry: ToolDefinition[] = [];

export const sessionCookieNames = {
  accessToken: "ps_access_token",
  demoUserId: "ps_demo_user_id"
} as const;

export type SessionCookieName = (typeof sessionCookieNames)[keyof typeof sessionCookieNames];

export type SessionCookieEnvironment = Partial<{
  APP_ENV: string;
  NODE_ENV: string;
  SESSION_COOKIE_SECURE: string;
}>;

export type SessionCookieOptions = {
  httpOnly: true;
  sameSite: "lax" | "strict";
  secure: boolean;
  path: "/";
  maxAge: number;
};

export type SerializedClearCookie = {
  name: SessionCookieName;
  header: string;
};

export function isProductionEnvironment(env: SessionCookieEnvironment = process.env): boolean {
  return env.APP_ENV === "production" || env.NODE_ENV === "production";
}

export function sessionCookieOptions(args: {
  env?: SessionCookieEnvironment;
  maxAgeSeconds: number;
}): SessionCookieOptions {
  const env = args.env ?? process.env;
  const production = isProductionEnvironment(env);
  if (production && env.SESSION_COOKIE_SECURE === "false") {
    throw new Error("Production session cookies must be secure");
  }

  return {
    httpOnly: true,
    sameSite: "lax",
    secure: production || env.SESSION_COOKIE_SECURE === "true",
    path: "/",
    maxAge: args.maxAgeSeconds
  };
}

export function accessTokenCookieOptions(env?: SessionCookieEnvironment): SessionCookieOptions {
  return sessionCookieOptions({
    ...(env ? { env } : {}),
    maxAgeSeconds: 60 * 60
  });
}

export function demoUserCookieOptions(env?: SessionCookieEnvironment): SessionCookieOptions {
  return sessionCookieOptions({
    ...(env ? { env } : {}),
    maxAgeSeconds: 60 * 60 * 8
  });
}

export function serializeClearSessionCookie(name: SessionCookieName, env?: SessionCookieEnvironment): SerializedClearCookie {
  const options = sessionCookieOptions({
    ...(env ? { env } : {}),
    maxAgeSeconds: 0
  });
  const attributes = [
    `${name}=`,
    "Path=/",
    "HttpOnly",
    `SameSite=${capitalizeSameSite(options.sameSite)}`,
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ...(options.secure ? ["Secure"] : [])
  ];

  return {
    name,
    header: attributes.join("; ")
  };
}

export function clearSessionCookieHeaders(env?: SessionCookieEnvironment): string[] {
  return [
    serializeClearSessionCookie(sessionCookieNames.accessToken, env).header,
    serializeClearSessionCookie(sessionCookieNames.demoUserId, env).header
  ];
}

function capitalizeSameSite(value: SessionCookieOptions["sameSite"]): string {
  return value === "lax" ? "Lax" : "Strict";
}
