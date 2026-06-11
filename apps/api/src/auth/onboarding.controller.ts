import { Body, Controller, Inject, Post, Req, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import type { DemoSession } from "./demo-users";
import type { OrganizationStructureBootstrapInput } from "./onboarding-contracts";
import { OnboardingService } from "./onboarding.service";
import { CurrentSession } from "./session.decorator";
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

  @Post("structure")
  bootstrapStructure(
    @CurrentSession() session: DemoSession,
    @Body() body: OrganizationStructureBootstrapInput
  ) {
    return this.onboarding.bootstrapOrganizationStructure(session, body);
  }

  @Post("profile")
  upsertProfile(
    @CurrentSession() session: DemoSession,
    @Body()
    body: {
      legalName?: string;
      preferredName?: string;
      employeeNumber?: string;
      facilityId?: string;
      unitId?: string;
      roleName?: string;
      employmentType?: "FULL_TIME" | "PART_TIME" | "PER_DIEM" | "CONTRACT" | "AGENCY";
    }
  ) {
    return this.onboarding.upsertEmployeeProfile(session, body);
  }
}
