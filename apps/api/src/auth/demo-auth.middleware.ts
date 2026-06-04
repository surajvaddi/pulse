import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import { AuthSessionService } from "./auth-session.service";
import { findDemoSession } from "./demo-users";
import { SupabaseJwtService } from "./supabase-jwt.service";
import { activeAdminUser } from "../admin/user.service";

@Injectable()
export class DemoAuthMiddleware implements NestMiddleware {
  constructor(
    @Inject(SupabaseJwtService) private readonly supabaseJwt: SupabaseJwtService,
    @Inject(AuthSessionService) private readonly sessions: AuthSessionService
  ) {}

  async use(
    request: Request & {
      session?: ReturnType<typeof findDemoSession>;
      supabaseClaims?: ReturnType<SupabaseJwtService["verifyBearerToken"]>;
    },
    response: Response,
    next: NextFunction
  ) {
    if (process.env.ENABLE_DEMO_AUTH !== "false") {
      const requestedUser = request.header("x-demo-user-id");
      const session = findDemoSession(requestedUser);
      if (!activeAdminUser(session.userId)) {
        response.status(401).json({ message: "PulseShift user is not active" });
        return;
      }
      request.session = session;
      next();
      return;
    }

    if (request.method === "GET" && (request.path === "/health" || request.path.startsWith("/invitations/"))) {
      next();
      return;
    }

    try {
      const claims = this.supabaseJwt.verifyBearerToken(request.header("authorization"));
      request.supabaseClaims = claims;
      try {
        request.session = await this.sessions.loadSupabaseSession(claims);
      } catch (error) {
        if (request.method === "POST" && request.path.startsWith("/invitations/")) {
          next();
          return;
        }
        throw error;
      }
      next();
    } catch (error) {
      response.status(401).json({
        message: error instanceof Error ? error.message : "Unauthorized"
      });
    }
  }
}
