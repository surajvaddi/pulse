import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { AuthSessionService } from "./auth-session.service";
import { InvitationController } from "./invitation.controller";
import { InvitationService } from "./invitation.service";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";
import { WorkspaceContextService } from "./workspace-context.service";
import { PermissionService } from "./permission.service";
import { SupabaseJwtService } from "./supabase-jwt.service";

@Module({
  controllers: [AuthController, InvitationController, OnboardingController],
  providers: [PermissionService, SupabaseJwtService, AuthSessionService, InvitationService, OnboardingService, WorkspaceContextService],
  exports: [PermissionService, SupabaseJwtService, AuthSessionService]
})
export class AuthModule {}
