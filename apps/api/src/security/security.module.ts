import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";

import { RateLimitMiddleware } from "./rate-limit.middleware";
import { RateLimitService } from "./rate-limit.service";
import { RequestContextMiddleware } from "./request-context";
import { RequestLoggingMiddleware } from "./request-logging.middleware";
import { RequestLoggingService } from "./request-logging.service";
import { SecurityExceptionFilter } from "./security-exception.filter";

@Module({
  providers: [
    RateLimitMiddleware,
    RateLimitService,
    RequestContextMiddleware,
    RequestLoggingMiddleware,
    RequestLoggingService,
    {
      provide: APP_FILTER,
      useClass: SecurityExceptionFilter
    }
  ],
  exports: [RateLimitMiddleware, RateLimitService, RequestContextMiddleware, RequestLoggingMiddleware, RequestLoggingService]
})
export class SecurityModule {}
