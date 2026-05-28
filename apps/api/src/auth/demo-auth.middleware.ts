import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import { findDemoSession } from "./demo-users";

@Injectable()
export class DemoAuthMiddleware implements NestMiddleware {
  use(request: Request & { session?: ReturnType<typeof findDemoSession> }, _response: Response, next: NextFunction) {
    const requestedUser = request.header("x-demo-user-id");
    request.session = findDemoSession(requestedUser);
    next();
  }
}

