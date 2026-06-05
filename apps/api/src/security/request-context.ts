import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

export const requestIdHeader = "x-request-id";

export type RequestWithContext = Request & {
  requestId?: string;
};

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: RequestWithContext, response: Response, next: NextFunction) {
    const inboundRequestId = request.header(requestIdHeader);
    const requestId = safeRequestId(inboundRequestId) ? inboundRequestId : randomUUID();
    request.requestId = requestId;
    response.setHeader(requestIdHeader, requestId);
    next();
  }
}

export function safeRequestId(value: string | undefined): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_.:-]{8,80}$/.test(value);
}
