import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import type { DemoSession } from "../auth/demo-users";
import { redactHeaders } from "./log-redaction";
import { RequestLoggingService } from "./request-logging.service";
import type { RequestWithContext } from "./request-context";

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  constructor(@Inject(RequestLoggingService) private readonly logs: RequestLoggingService) {}

  use(request: Request & RequestWithContext & { session?: DemoSession }, response: Response, next: NextFunction) {
    const startedAt = Date.now();
    response.on("finish", () => {
      this.logs.append({
        requestId: request.requestId ?? "missing-request-id",
        method: request.method,
        path: request.originalUrl ?? request.path,
        statusCode: response.statusCode,
        latencyMs: Date.now() - startedAt,
        ...(request.session
          ? {
              organizationId: request.session.organizationId,
              actorUserId: request.session.userId,
              actorRole: request.session.role
            }
          : {}),
        metadata: {
          headers: redactHeaders({
            authorization: request.header("authorization"),
            cookie: request.header("cookie"),
            origin: request.header("origin"),
            "user-agent": request.header("user-agent")
          })
        }
      });
    });
    next();
  }
}
