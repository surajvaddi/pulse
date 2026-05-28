import { createHmac, timingSafeEqual } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";

export type SupabaseJwtClaims = {
  sub: string;
  email?: string;
  exp?: number;
  aud?: string | string[];
  role?: string;
};

function base64UrlDecode(value: string) {
  return Buffer.from(value.replaceAll("-", "+").replaceAll("_", "/"), "base64");
}

function base64UrlEncode(value: Buffer) {
  return value.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function parseJwtPart<T>(value: string, message: string): T {
  try {
    return JSON.parse(base64UrlDecode(value).toString("utf8")) as T;
  } catch {
    throw new UnauthorizedException(message);
  }
}

@Injectable()
export class SupabaseJwtService {
  verifyBearerToken(authorizationHeader: string | undefined): SupabaseJwtClaims {
    const token = authorizationHeader?.startsWith("Bearer ")
      ? authorizationHeader.slice("Bearer ".length)
      : undefined;
    if (!token) {
      throw new UnauthorizedException("Missing Supabase bearer token");
    }

    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      throw new UnauthorizedException("Malformed Supabase bearer token");
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new UnauthorizedException("Supabase JWT verification is not configured");
    }

    const header = parseJwtPart<{ alg?: string }>(encodedHeader, "Malformed Supabase bearer token header");
    if (header.alg !== "HS256") {
      throw new UnauthorizedException("Unsupported Supabase JWT algorithm");
    }

    const expectedSignature = base64UrlEncode(
      createHmac("sha256", jwtSecret).update(`${encodedHeader}.${encodedPayload}`).digest()
    );
    const actual = Buffer.from(encodedSignature);
    const expected = Buffer.from(expectedSignature);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException("Invalid Supabase bearer token signature");
    }

    const claims = parseJwtPart<SupabaseJwtClaims>(encodedPayload, "Malformed Supabase bearer token claims");
    if (!claims.sub) {
      throw new UnauthorizedException("Supabase bearer token is missing subject");
    }
    if (claims.exp && claims.exp * 1000 < Date.now()) {
      throw new UnauthorizedException("Supabase bearer token is expired");
    }
    return claims;
  }
}
