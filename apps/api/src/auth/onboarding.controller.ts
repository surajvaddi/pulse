import { Body, Controller, Inject, Post, Req, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { OnboardingService } from "./onboarding.service";
import type { SupabaseJwtClaims } from "./supabase-jwt.service";

@Controller("onboarding")
export class OnboardingController {
  constructor(@Inject(OnboardingService) private readonly onboarding: OnboardingService) {}

  @Post("organizations")
  createOrganization(
    @Req() request: Request & { supabaseClaims?: SupabaseJwtClaims },
    @Body() body: { name?: string; timezone?: string; displayName?: string }
  ) {
    if (!request.supabaseClaims) {
      throw new UnauthorizedException("Sign in with Supabase before creating an organization.");
    }
    return this.onboarding.createOrganizationForSupabaseUser(request.supabaseClaims, body);
  }
}
