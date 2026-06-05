import { Module } from "@nestjs/common";

import { RateLimitMiddleware } from "./rate-limit.middleware";
import { RateLimitService } from "./rate-limit.service";

@Module({
  providers: [RateLimitMiddleware, RateLimitService],
  exports: [RateLimitMiddleware, RateLimitService]
})
export class SecurityModule {}
