import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { assertShiftCoverageInvariants, type ShiftSlotContract } from "@pulseshift/domain";
import { prisma } from "@pulseshift/db";

import {
  demoApprovals,
  demoEmployeeByUserId,
  demoStaffDirectory
} from "../demo/demo-data";
import { demoSessions, type DemoSession } from "../auth/demo-users";
import { PermissionService } from "../auth/permission.service";
import { ShiftEligibilityService } from "./shift-eligibility.service";
import { recordShiftPipelineEvent } from "./shift-pipeline-events";
import { ShiftPipelineRepositoryProvider } from "./shift-pipeline.repository";
import {
  demoShiftAssignments,
  demoShiftSlots
} from "./shift-pipeline.repository";
import {
  evaluateAssignmentCandidate,
  type AssignmentCandidate
} from "./assignment-candidate";

@Injectable()
export class ShiftManagerService {
  constructor(
    @Inject(PermissionService) private readonly permissions: PermissionService,
    @Inject(ShiftEligibilityService) private readonly eligibility: ShiftEligibilityService,
    @Inject(ShiftPipelineRepositoryProvider) private readonly repositories: ShiftPipelineRepositoryProvider
  ) {}

  async listAssignmentCandidates(
    session: DemoSession,
    slotId: string
  ): Promise<AssignmentCandidate[]> {
    const repository = this.repositories.repository();
    const slot = await repository.findSlot({
      organizationId: session.organizationId,
      slotId
    });
    if (!slot) throw new NotFoundException("Shift slot not found");
    this.assertCanAssign(session, slot.unitId);
    return this.assignmentCandidates(session, slot);
  }

  async evaluateCurrentUserForSlot(
    session: DemoSession,
    slotId: string
  ): Promise<AssignmentCandidate | undefined> {
    const slot = await this.repositories.repository().findSlot({
      organizationId: session.organizationId,
      slotId
    });
    if (!slot) throw new NotFoundException("Shift slot not found");
    return (await this.assignmentCandidates(session, slot)).find(
      (candidate) => candidate.userId === session.userId
    );
  }

  private async assignmentCandidates(
    session: DemoSession,
    slot: ShiftSlotContract
  ): Promise<AssignmentCandidate[]> {
    if (process.env.WORKFLOW_PERSISTENCE !== "prisma") {
      return demoSessions
        .filter((candidate) => candidate.role !== "AI_AGENT_SERVICE")
        .map((candidate) => {
          const employeeId = demoEmployeeByUserId.get(candidate.userId);
          const staff = demoStaffDirectory.find(
            (member) => member.employeeId === employeeId
          );
          return evaluateAssignmentCandidate(slot, {
            employeeId: employeeId ?? "",
            userId: candidate.userId,
            displayName: candidate.displayName,
            accountActive: Boolean(employeeId),
            employeeActive: Boolean(employeeId),
            unitId: staff?.unitId ?? "",
            roleId: this.demoRoleId(staff?.role),
            verifiedCertificationIds: this.demoCertificationIds(
              staff?.certifications ?? []
            ),
            unavailableWindows: [],
            assignedSlots: demoShiftAssignments
              .filter(
                (assignment) =>
                  assignment.employeeId === employeeId &&
                  assignment.status === "ACTIVE"
              )
              .map((assignment) =>
                demoShiftSlots.find(
                  (candidateSlot) => candidateSlot.id === assignment.slotId
                )
              )
              .filter((candidateSlot): candidateSlot is typeof slot =>
                Boolean(candidateSlot)
              )
              .map((candidateSlot) => ({
                id: candidateSlot.id,
                startsAt: candidateSlot.startsAt,
                endsAt: candidateSlot.endsAt
              }))
          });
        })
        .sort((left, right) =>
          left.eligibility.localeCompare(right.eligibility)
        );
    }

    const employees = await prisma.employeeProfile.findMany({
      where: { organizationId: session.organizationId },
      include: {
        user: true,
        certifications: true,
        availabilityWindows: {
          where: {
            status: "ACTIVE",
            type: "UNAVAILABLE",
            startAt: { lt: new Date(slot.endsAt) },
            endAt: { gt: new Date(slot.startsAt) }
          }
        },
        shiftAssignments: {
          where: { status: "ACTIVE" },
          include: { slot: true }
        }
      }
    });

    return employees
      .filter(
        (employee): employee is typeof employee & {
          userId: string;
          user: NonNullable<typeof employee.user>;
        } => Boolean(employee.userId && employee.user)
      )
      .map((employee) =>
        evaluateAssignmentCandidate(slot, {
          employeeId: employee.id,
          userId: employee.userId,
          displayName:
            employee.preferredName ??
            employee.legalName ??
            employee.user.displayName,
          accountActive: employee.user.status === "ACTIVE",
          employeeActive: employee.status === "ACTIVE",
          unitId: employee.primaryUnitId,
          roleId: employee.roleId,
          verifiedCertificationIds: employee.certifications
            .filter(
              (certification) =>
                certification.status === "VERIFIED" &&
                (!certification.expiresAt ||
                  certification.expiresAt > new Date(slot.startsAt))
            )
            .map((certification) => certification.certificationId),
          unavailableWindows: employee.availabilityWindows.map((window) => ({
            startsAt: window.startAt.toISOString(),
            endsAt: window.endAt.toISOString()
          })),
          assignedSlots: employee.shiftAssignments.map((assignment) => ({
            id: assignment.slot.id,
            startsAt: assignment.slot.startAt.toISOString(),
            endsAt: assignment.slot.endAt.toISOString()
          }))
        })
      )
      .sort((left, right) =>
        left.eligibility.localeCompare(right.eligibility)
      );
  }

  async decidePendingClaim(session: DemoSession, claimId: string, decision: "approve" | "deny", reason?: string) {
    if (process.env.WORKFLOW_PERSISTENCE === "prisma") {
      return this.decidePersistedClaim(session, claimId, decision, reason);
    }
    const repository = this.repositories.repository();
    const [claim] = await repository
      .listClaims({ organizationId: session.organizationId, statuses: ["PENDING_APPROVAL"] })
      .then((claims) => claims.filter((candidate) => candidate.id === claimId));
    if (!claim) {
      throw new NotFoundException("Pending claim not found");
    }

    const slot = await repository.findSlot({ organizationId: session.organizationId, slotId: claim.slotId });
    if (!slot) {
      throw new NotFoundException("Claimed shift slot not found");
    }
    this.assertCanAssign(session, slot.unitId);

    const approval = demoApprovals.find((candidate) => candidate.id === claim.approvalRequestId);
    if (!approval) {
      throw new NotFoundException("Claim approval request not found");
    }

    if (decision === "deny") {
      approval.status = "DENIED";
      approval.approverUserId = session.userId;
      if (reason) {
        approval.decisionReason = reason;
      }
      const deniedClaim = await repository.updateClaim({
        organizationId: session.organizationId,
        claimId,
        status: "DENIED",
        decidedAt: new Date().toISOString()
      });
      await repository.updateSlotStatus({
        organizationId: session.organizationId,
        slotId: slot.id,
        status: "OPEN",
        riskFlags: slot.riskFlags
      });
      await this.assertSlotInvariant(session.organizationId, slot.id);
      recordShiftPipelineEvent({
        organizationId: session.organizationId,
        actorUserId: session.userId,
        action: "shift_pipeline.claim.denied",
        objectType: "ShiftClaimRequest",
        objectId: deniedClaim.id,
        ...(reason ? { reason } : {}),
        after: { slotId: slot.id, approvalId: approval.id },
        notifyUserId: claim.userId,
        notificationType: "SHIFT_CLAIM_DENIED"
      });
      return { status: "DENIED" as const, claim: deniedClaim, approval };
    }

    const activeAssignment = await repository.findActiveAssignmentForSlot({
      organizationId: session.organizationId,
      slotId: slot.id
    });
    if (activeAssignment) {
      throw new BadRequestException("Shift slot already has an active assignment.");
    }

    const assignment = await repository.createAssignment({
      organizationId: session.organizationId,
      slotId: slot.id,
      employeeId: claim.employeeId,
      assignedByUserId: session.userId,
      status: "ACTIVE",
      source: "CLAIM"
    });
    const assignedClaim = await repository.updateClaim({
      organizationId: session.organizationId,
      claimId,
      status: "ASSIGNED",
      assignmentId: assignment.id,
      decidedAt: new Date().toISOString()
    });
    const assignedSlot = await repository.updateSlotStatus({
      organizationId: session.organizationId,
      slotId: slot.id,
      status: "ASSIGNED",
      riskFlags: claim.policyDecision.riskFlags
    });
    approval.status = "APPROVED";
    approval.approverUserId = session.userId;
    if (reason) {
      approval.decisionReason = reason;
    }
    await this.assertSlotInvariant(session.organizationId, slot.id);
    recordShiftPipelineEvent({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "shift_pipeline.claim.approved",
      objectType: "ShiftClaimRequest",
      objectId: assignedClaim.id,
      ...(reason ? { reason } : {}),
      after: { slotId: slot.id, assignmentId: assignment.id, approvalId: approval.id },
      notifyUserId: claim.userId,
      notificationType: "SHIFT_CLAIM_APPROVED"
    });
    return { status: "ASSIGNED" as const, slot: assignedSlot, claim: assignedClaim, assignment, approval };
  }

  async directAssignSlot(
    session: DemoSession,
    slotId: string,
    assigneeUserId: string,
    options: { overrideReason?: string } = {}
  ) {
    const repository = this.repositories.repository();
    const slot = await repository.findSlot({ organizationId: session.organizationId, slotId });
    if (!slot) {
      throw new NotFoundException("Shift slot not found");
    }
    this.assertCanAssign(session, slot.unitId);

    const activeAssignment = await repository.findActiveAssignmentForSlot({
      organizationId: session.organizationId,
      slotId
    });
    if (activeAssignment) {
      throw new BadRequestException("Shift slot already has an active assignment.");
    }

    const candidate = (await this.listAssignmentCandidates(session, slotId)).find(
      (item) => item.userId === assigneeUserId
    );
    if (!candidate) {
      throw new BadRequestException(
        "Selected assignee is not an assignment candidate for this slot."
      );
    }
    if (candidate.eligibility === "BLOCKED") {
      throw new BadRequestException({
        message: "Direct assignment blocked by policy",
        candidate
      });
    }
    if (candidate.eligibility === "WARNING") {
      if (!options.overrideReason) {
        throw new BadRequestException(
          "Policy warnings require an override reason."
        );
      }
      if (
        !this.permissions.hasPermission(session, "shift:assign:override", {
          type: "UNIT",
          unitId: slot.unitId
        })
      ) {
        throw new ForbiddenException(
          "Direct assignment override requires shift override permission."
        );
      }
    }

    const assignee = await this.assigneeForUser(session.organizationId, assigneeUserId);
    const assigneeSession = assignee.session;
    const employeeId = assignee.employeeId;

    const policyDecision =
      process.env.WORKFLOW_PERSISTENCE === "prisma"
        ? {
            allowed: true,
            requiresApproval: candidate.eligibility === "WARNING",
            riskFlags: candidate.riskFlags,
            blockingReasons: [],
            warnings: candidate.reasons,
            evaluatedAt: new Date().toISOString()
          }
        : this.eligibility.evaluateClaim({
            session: assigneeSession,
            slot,
            employeeId
          });

    const assignment = await repository.createAssignment({
      organizationId: session.organizationId,
      slotId,
      employeeId,
      assignedByUserId: session.userId,
      status: "ACTIVE",
      source: "MANAGER_ASSIGNMENT"
    });
    const assignedSlot = await repository.updateSlotStatus({
      organizationId: session.organizationId,
      slotId,
      status: "ASSIGNED",
      riskFlags: policyDecision.riskFlags
    });
    await this.assertSlotInvariant(session.organizationId, slotId);
    recordShiftPipelineEvent({
      organizationId: session.organizationId,
      actorUserId: session.userId,
      action: "shift_pipeline.slot.direct_assigned",
      objectType: "ShiftAssignment",
      objectId: assignment.id,
      ...(options.overrideReason ? { reason: options.overrideReason } : {}),
      after: { slotId, assigneeUserId, policyDecision },
      notifyUserId: assigneeUserId,
      notificationType: "SHIFT_DIRECT_ASSIGNED"
    });
    return { status: "ASSIGNED" as const, slot: assignedSlot, assignment, policyDecision };
  }

  private assertCanAssign(session: DemoSession, unitId: string) {
    if (!this.permissions.hasPermission(session, "shift:assign", { type: "UNIT", unitId })) {
      throw new ForbiddenException("User is not allowed to assign shifts for this unit.");
    }
  }

  private async assigneeForUser(organizationId: string, assigneeUserId: string) {
    if (process.env.WORKFLOW_PERSISTENCE === "prisma") {
      const user = await prisma.user.findFirst({
        where: { id: assigneeUserId, organizationId, status: "ACTIVE" },
        include: { roles: true, employeeProfile: true }
      });
      if (!user?.employeeProfile) {
        throw new BadRequestException("Assignee does not have a claimable employee profile.");
      }
      const primaryRole = user.roles.at(0);
      if (!primaryRole) {
        throw new BadRequestException("Assignee does not have an assigned role.");
      }
      return {
        employeeId: user.employeeProfile.id,
        session: {
          userId: user.id,
          ...(user.supabaseAuthId ? { supabaseAuthId: user.supabaseAuthId } : {}),
          organizationId: user.organizationId,
          displayName: user.displayName,
          email: user.email,
          role: primaryRole.role,
          grants: user.roles.flatMap((role) =>
            role.permissions.map((permission) => ({
              permission: permission as DemoSession["grants"][number]["permission"],
              scope: role.scope as DemoSession["grants"][number]["scope"]
            }))
          )
        } satisfies DemoSession
      };
    }
    const assigneeSession = demoSessions.find((candidate) => candidate.userId === assigneeUserId);
    const employeeId = demoEmployeeByUserId.get(assigneeUserId);
    if (!assigneeSession || !employeeId) {
      throw new BadRequestException("Assignee does not have a claimable employee profile.");
    }
    return { session: assigneeSession, employeeId };
  }

  private demoRoleId(role?: string) {
    if (role === "Charge RN") return "role_charge_rn";
    if (role === "Agency RN") return "role_agency_rn";
    return role?.includes("RN") ? "role_rn" : "";
  }

  private demoCertificationIds(certifications: string[]) {
    const ids: Record<string, string> = {
      BLS: "cert_bls",
      ACLS: "cert_acls",
      "ICU Qualified": "cert_icu_qualified",
      "Charge Nurse Authorization": "cert_charge_authorization",
      "Agency Contract": "cert_agency_contract"
    };
    return certifications
      .map((certification) => ids[certification])
      .filter((id): id is string => Boolean(id));
  }

  private async decidePersistedClaim(
    session: DemoSession,
    claimId: string,
    decision: "approve" | "deny",
    reason?: string
  ) {
    const existing = await prisma.shiftClaimRequest.findFirst({
      where: {
        id: claimId,
        organizationId: session.organizationId,
        status: "PENDING_APPROVAL"
      },
      include: { slot: true }
    });
    if (!existing) throw new NotFoundException("Pending claim not found");
    this.assertCanAssign(session, existing.slot.unitId);

    try {
      return await prisma.$transaction(
        async (tx) => {
          const claim = await tx.shiftClaimRequest.findFirst({
            where: {
              id: claimId,
              organizationId: session.organizationId,
              status: "PENDING_APPROVAL"
            }
          });
          if (!claim?.approvalRequestId) {
            throw new NotFoundException("Claim approval request not found");
          }
          const approval = await tx.approvalRequest.findFirst({
            where: {
              id: claim.approvalRequestId,
              organizationId: session.organizationId,
              claimId,
              slotId: claim.slotId,
              status: "PENDING"
            }
          });
          if (!approval) {
            throw new NotFoundException("Claim approval request not found");
          }
          const decidedAt = new Date();

          if (decision === "deny") {
            const [deniedClaim, deniedApproval, openSlot] =
              await Promise.all([
                tx.shiftClaimRequest.update({
                  where: { id: claim.id },
                  data: { status: "DENIED", decidedAt }
                }),
                tx.approvalRequest.update({
                  where: { id: approval.id },
                  data: {
                    status: "DENIED",
                    approverUserId: session.userId,
                    decisionReason: reason ?? null,
                    decidedAt
                  }
                }),
                tx.shiftSlot.update({
                  where: { id: claim.slotId },
                  data: { status: "OPEN" }
                })
              ]);
            await tx.notification.create({
              data: {
                organizationId: session.organizationId,
                recipientUserId: claim.userId,
                channel: "IN_APP",
                type: "SHIFT_UPDATED",
                category: "APPROVAL",
                payload: {
                  claimId: claim.id,
                  approvalId: approval.id,
                  decision: "DENIED",
                  reason: reason ?? null
                }
              }
            });
            await tx.auditLog.create({
              data: {
                organizationId: session.organizationId,
                actorUserId: session.userId,
                actorType: "USER",
                action: "shift_pipeline.claim.denied",
                objectType: "ShiftClaimRequest",
                objectId: claim.id,
                reason: reason ?? null,
                after: { approvalId: approval.id, slotId: claim.slotId }
              }
            });
            return {
              status: "DENIED" as const,
              claim: deniedClaim,
              approval: deniedApproval,
              slot: openSlot
            };
          }

          const activeAssignment = await tx.shiftAssignment.findFirst({
            where: { slotId: claim.slotId, status: "ACTIVE" }
          });
          if (activeAssignment) {
            throw new BadRequestException(
              "Shift slot already has an active assignment."
            );
          }
          const assignment = await tx.shiftAssignment.create({
            data: {
              organizationId: session.organizationId,
              slotId: claim.slotId,
              employeeId: claim.employeeId,
              assignedByUserId: session.userId,
              status: "ACTIVE",
              source: "CLAIM"
            }
          });
          const assignedClaim = await tx.shiftClaimRequest.update({
            where: { id: claim.id },
            data: {
              status: "ASSIGNED",
              assignmentId: assignment.id,
              decidedAt
            }
          });
          const approved = await tx.approvalRequest.update({
            where: { id: approval.id },
            data: {
              status: "APPROVED",
              approverUserId: session.userId,
              decisionReason: reason ?? null,
              decidedAt
            }
          });
          const assignedSlot = await tx.shiftSlot.update({
            where: { id: claim.slotId },
            data: { status: "ASSIGNED" }
          });
          await tx.notification.create({
            data: {
              organizationId: session.organizationId,
              recipientUserId: claim.userId,
              channel: "IN_APP",
              type: "SHIFT_ASSIGNED",
              category: "APPROVAL",
              priority: "HIGH",
              payload: {
                claimId: claim.id,
                approvalId: approval.id,
                assignmentId: assignment.id
              }
            }
          });
          await tx.auditLog.create({
            data: {
              organizationId: session.organizationId,
              actorUserId: session.userId,
              actorType: "USER",
              action: "shift_pipeline.claim.approved",
              objectType: "ShiftClaimRequest",
              objectId: claim.id,
              reason: reason ?? null,
              after: {
                approvalId: approval.id,
                slotId: claim.slotId,
                assignmentId: assignment.id
              }
            }
          });
          return {
            status: "ASSIGNED" as const,
            claim: assignedClaim,
            approval: approved,
            assignment,
            slot: assignedSlot
          };
        },
        { isolationLevel: "Serializable" }
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "P2034"
      ) {
        throw new BadRequestException(
          "Claim decision conflicted with another assignment. Refresh and retry."
        );
      }
      throw error;
    }
  }

  private async assertSlotInvariant(organizationId: string, slotId: string) {
    const repository = this.repositories.repository();
    const slot = await repository.findSlot({ organizationId, slotId });
    if (!slot) {
      throw new NotFoundException("Shift slot not found while validating manager invariant");
    }
    return assertShiftCoverageInvariants({
      slot,
      assignments: await repository.listAssignments({ organizationId, slotId }),
      claims: await repository.listClaims({ organizationId, slotId })
    });
  }
}
