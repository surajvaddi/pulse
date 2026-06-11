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
