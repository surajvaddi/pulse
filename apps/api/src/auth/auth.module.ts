import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthSessionService } from "./auth-session.service";
import { InvitationController } from "./invitation.controller";
import { InvitationService } from "./invitation.service";
import { PermissionService } from "./permission.service";
import { SupabaseJwtService } from "./supabase-jwt.service";

@Module({
  controllers: [AuthController, InvitationController],
  providers: [PermissionService, SupabaseJwtService, AuthSessionService, InvitationService],
  exports: [PermissionService, SupabaseJwtService, AuthSessionService]
})
export class AuthModule {}
