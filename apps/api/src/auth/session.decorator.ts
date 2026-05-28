import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

import type { DemoSession } from "./demo-users";

export const CurrentSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): DemoSession => {
    const request = context.switchToHttp().getRequest<{ session: DemoSession }>();
    return request.session;
  }
);

