import { Controller, Get, Inject, Post, Res } from "@nestjs/common";
import { clearSessionCookieHeaders } from "@pulseshift/tools";
import type { Response } from "express";

import { CurrentSession } from "./session.decorator";
import type { DemoSession } from "./demo-users";
import { PermissionService } from "./permission.service";

@Controller("auth")
export class AuthController {
  constructor(@Inject(PermissionService) private readonly permissions: PermissionService) {}

  @Get("me")
  me(@CurrentSession() session: DemoSession) {
    return {
      ...session,
      permissions: this.permissions.effectivePermissions(session),
      scopes: this.permissions.effectiveScopes(session)
    };
  }

  @Post("logout")
  logout(@Res({ passthrough: true }) response: Response) {
    response.setHeader("Set-Cookie", clearSessionCookieHeaders(process.env));
    return { status: "SIGNED_OUT" };
  }
}
