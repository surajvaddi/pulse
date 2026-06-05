import type { CorsOptions } from "@nestjs/common/interfaces/external/cors-options.interface";

type CorsEnvironment = Partial<{
  APP_ENV: string;
  NODE_ENV: string;
  WEB_ORIGIN: string;
  WEB_ORIGINS: string;
  CORS_ALLOWED_ORIGINS: string;
}>;

const developmentOrigins = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001"];

export function allowedCorsOrigins(env: CorsEnvironment = process.env): string[] {
  const configured = splitOrigins(env.CORS_ALLOWED_ORIGINS ?? env.WEB_ORIGINS ?? env.WEB_ORIGIN);
  const origins = configured.length ? configured : isProductionLike(env) ? [] : developmentOrigins;

  if (isProductionLike(env) && origins.length === 0) {
    throw new Error("Production CORS requires CORS_ALLOWED_ORIGINS or WEB_ORIGINS");
  }
  if (isProductionLike(env) && origins.includes("*")) {
    throw new Error("Production CORS cannot use wildcard origins");
  }

  return [...new Set(origins)];
}

export function buildCorsOptions(env: CorsEnvironment = process.env): CorsOptions {
  const allowedOrigins = allowedCorsOrigins(env);

  return {
    credentials: true,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins.includes("*") || allowedOrigins.includes(origin));
    }
  };
}

function splitOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isProductionLike(env: CorsEnvironment): boolean {
  return env.APP_ENV === "production" || env.NODE_ENV === "production";
}
