import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { DemoAuthMiddleware } from "./auth/demo-auth.middleware";
import { AdminModule } from "./admin/admin.module";
import { DemoModule } from "./demo/demo.module";
import { HealthController } from "./health.controller";
import { RateLimitMiddleware } from "./security/rate-limit.middleware";
import { RequestContextMiddleware } from "./security/request-context";
import { RequestLoggingMiddleware } from "./security/request-logging.middleware";
import { SecurityModule } from "./security/security.module";

@Module({
  imports: [AuthModule, AdminModule, DemoModule, SecurityModule],
  controllers: [HealthController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware, RequestLoggingMiddleware, DemoAuthMiddleware, RateLimitMiddleware).forRoutes("*");
  }
}
