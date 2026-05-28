import { Controller, Get, Inject } from "@nestjs/common";

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
}
