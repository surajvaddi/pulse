import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import { findDemoSession, findDemoSessionBySupabaseAuthId } from "./demo-users";
import { SupabaseJwtService } from "./supabase-jwt.service";

@Injectable()
export class DemoAuthMiddleware implements NestMiddleware {
  constructor(@Inject(SupabaseJwtService) private readonly supabaseJwt: SupabaseJwtService) {}

  use(request: Request & { session?: ReturnType<typeof findDemoSession> }, response: Response, next: NextFunction) {
    if (process.env.ENABLE_DEMO_AUTH !== "false") {
      const requestedUser = request.header("x-demo-user-id");
      request.session = findDemoSession(requestedUser);
      next();
      return;
    }

    try {
      const claims = this.supabaseJwt.verifyBearerToken(request.header("authorization"));
      request.session = findDemoSessionBySupabaseAuthId(claims.sub);
      next();
    } catch (error) {
      response.status(401).json({
        message: error instanceof Error ? error.message : "Unauthorized"
      });
    }
  }
}
