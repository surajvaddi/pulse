import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";

import { AuthModule } from "./auth/auth.module";
import { DemoAuthMiddleware } from "./auth/demo-auth.middleware";
import { HealthController } from "./health.controller";

@Module({
  imports: [AuthModule],
  controllers: [HealthController]
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DemoAuthMiddleware).forRoutes("*");
  }
}
