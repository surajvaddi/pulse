import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller";
import { PermissionService } from "./permission.service";

@Module({
  controllers: [AuthController],
  providers: [PermissionService],
  exports: [PermissionService]
})
export class AuthModule {}

