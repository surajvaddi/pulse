import { Inject, Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import { RateLimitService } from "./rate-limit.service";
import type { DemoSession } from "../auth/demo-users";

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  constructor(@Inject(RateLimitService) private readonly rateLimits: RateLimitService) {}

  use(request: Request & { session?: DemoSession }, response: Response, next: NextFunction) {
    const decision = this.rateLimits.check(request);
    response.setHeader("x-ratelimit-category", decision.category);
    response.setHeader("x-ratelimit-limit", String(decision.limit));
    response.setHeader("x-ratelimit-remaining", String(decision.remaining));
    response.setHeader("x-ratelimit-reset", String(Math.ceil(decision.resetAt / 1000)));

    if (!decision.allowed) {
      response.status(429).json({
        message: "Too many requests",
        category: decision.category,
        retryAfterSeconds: Math.max(Math.ceil((decision.resetAt - Date.now()) / 1000), 1)
      });
      return;
    }

    next();
  }
}
