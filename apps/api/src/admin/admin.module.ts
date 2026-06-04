import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { AdminController } from "./admin.controller";
import { FacilityAdminService } from "./facility.service";
import { InvitationAdminService } from "./invitation-admin.service";
import { OrganizationAdminService } from "./organization.service";
import { RoleAdminService } from "./role.service";
import { UnitAdminService } from "./unit.service";
import { UserAdminService } from "./user.service";

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [
    OrganizationAdminService,
    FacilityAdminService,
    UnitAdminService,
    UserAdminService,
    RoleAdminService,
    InvitationAdminService
  ]
})
export class AdminModule {}
