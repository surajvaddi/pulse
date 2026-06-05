import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type { Response } from "express";

import type { RequestWithContext } from "./request-context";
import { MonitoringService } from "./monitoring.service";
import type { DemoSession } from "../auth/demo-users";

@Catch()
@Injectable()
export class SecurityExceptionFilter implements ExceptionFilter {
  constructor(@Inject(MonitoringService) private readonly monitoring: MonitoringService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<RequestWithContext & { session?: DemoSession }>();
    const response = context.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : { message: "Internal server error" };

    if (status === HttpStatus.FORBIDDEN) {
      this.monitoring.emitForSession({
        name: "permission.denied",
        severity: "WARN",
        session: request.session,
        requestId: request.requestId,
        route: request.originalUrl,
        metadata: payload as Record<string, unknown>
      });
    } else if (status >= 500) {
      this.monitoring.emitForSession({
        name: "workflow.error",
        severity: "ERROR",
        session: request.session,
        requestId: request.requestId,
        route: request.originalUrl,
        metadata: payload as Record<string, unknown>
      });
    }

    response.status(status).json({
      ...(typeof payload === "object" && payload !== null ? payload : { message: payload }),
      requestId: request.requestId
    });
  }
}
