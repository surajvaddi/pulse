import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { InvitationController } from "./invitation.controller";
import { PermissionService } from "./permission.service";
import { SupabaseJwtService } from "./supabase-jwt.service";

@Module({
  controllers: [AuthController, InvitationController],
  providers: [PermissionService, SupabaseJwtService],
  exports: [PermissionService, SupabaseJwtService]
})
export class AuthModule {}
