import type { ShiftPipelineClaim, ShiftPipelineSlot } from "@/lib/api";
import { formatScheduleTime } from "@/lib/schedule-view-model";

export type OpenShiftCardView = {
  id: string;
  unitLabel: string;
  roleLabel: string;
  dateLabel: string;
  timeLabel: string;
  statusLabel: string;
  statusTone: "open" | "pending" | "assigned" | "neutral";
  certificationLabel: string;
  riskLabel: string;
  canClaim: boolean;
  claimButtonLabel: string;
};

const ROLE_LABELS: Record<string, string> = {
  role_rn: "RN",
  role_charge_rn: "Charge RN",
  role_agency_rn: "Agency RN"
};

const CERTIFICATION_LABELS: Record<string, string> = {
  cert_bls: "BLS",
  cert_acls: "ACLS",
  cert_icu_qualified: "ICU Qualified",
  cert_charge_authorization: "Charge authorization",
  cert_agency_contract: "Agency contract"
};

const UNIT_LABELS: Record<string, string> = {
  unit_icu: "ICU",
  unit_ed: "ED"
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function statusTone(status: string): OpenShiftCardView["statusTone"] {
  if (status === "OPEN") {
    return "open";
  }
  if (status.includes("PENDING") || status === "CLAIM_PENDING") {
    return "pending";
  }
  if (status === "ASSIGNED") {
    return "assigned";
  }
  return "neutral";
}

function claimForSlot(slot: ShiftPipelineSlot, claims: ShiftPipelineClaim[]) {
  return claims.find((claim) => claim.slotId === slot.id);
}

export function buildOpenShiftCards(slots: ShiftPipelineSlot[], claims: ShiftPipelineClaim[]): OpenShiftCardView[] {
  return [...slots]
    .sort((left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime())
    .map((slot) => {
      const claim = claimForSlot(slot, claims);
      const pendingClaim = claim?.status === "PENDING_APPROVAL" || slot.status === "CLAIM_PENDING";
      return {
        id: slot.id,
        unitLabel: UNIT_LABELS[slot.unitId] ?? slot.unitId,
        roleLabel: ROLE_LABELS[slot.roleRequiredId] ?? slot.roleRequiredId,
        dateLabel: formatDate(slot.startsAt),
        timeLabel: `${formatScheduleTime(slot.startsAt)}-${formatScheduleTime(slot.endsAt)}`,
        statusLabel: claim ? claim.status.replaceAll("_", " ") : slot.status.replaceAll("_", " "),
        statusTone: pendingClaim ? "pending" : statusTone(slot.status),
        certificationLabel:
          slot.certificationRequiredIds.map((certification) => CERTIFICATION_LABELS[certification] ?? certification).join(", ") ||
          "No extra certifications",
        riskLabel: slot.riskFlags.length > 0 ? slot.riskFlags.map((risk) => risk.replaceAll("_", " ")).join(", ") : "No active risk flags",
        canClaim: slot.status === "OPEN" && !pendingClaim,
        claimButtonLabel: pendingClaim ? "Claim pending" : "Claim shift"
      };
    });
}
