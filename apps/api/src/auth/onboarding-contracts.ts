import { z } from "zod";
import { UnitTypeSchema } from "@pulseshift/domain";

import { FacilityRecordSchema, UnitRecordSchema } from "../admin/admin-contracts";

export const OrganizationStructureBootstrapInputSchema = z
  .object({
    facilityName: z.string().min(1),
    facilityTimezone: z.string().min(1),
    unitName: z.string().min(1),
    unitType: UnitTypeSchema
  })
  .strict();

export const OrganizationStructureBootstrapResultSchema = z
  .object({
    facility: FacilityRecordSchema,
    unit: UnitRecordSchema,
    nextStep: z.literal("/onboarding/profile")
  })
  .strict();

export type OrganizationStructureBootstrapInput = z.infer<typeof OrganizationStructureBootstrapInputSchema>;
export type OrganizationStructureBootstrapResult = z.infer<typeof OrganizationStructureBootstrapResultSchema>;

export const NotificationPreferencesOnboardingInputSchema = z
  .object({
    phone: z.string().optional(),
    emailAlertsEnabled: z.boolean().default(true),
    smsAlertsEnabled: z.boolean().default(false)
  })
  .strict();

export const NotificationPreferencesOnboardingResultSchema = z
  .object({
    nextStep: z.enum(["/onboarding/integrations", "/app/home"])
  })
  .strict();

export const IntegrationsOnboardingInputSchema = z
  .object({
    action: z.enum(["skip", "continue"])
  })
  .strict();

export const IntegrationsOnboardingResultSchema = z
  .object({
    nextStep: z.literal("/onboarding/organization")
  })
  .strict();

export type NotificationPreferencesOnboardingInput = z.infer<
  typeof NotificationPreferencesOnboardingInputSchema
>;
export type NotificationPreferencesOnboardingResult = z.infer<
  typeof NotificationPreferencesOnboardingResultSchema
>;
export type IntegrationsOnboardingInput = z.infer<typeof IntegrationsOnboardingInputSchema>;
export type IntegrationsOnboardingResult = z.infer<typeof IntegrationsOnboardingResultSchema>;
