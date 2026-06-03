import { Inject, Injectable } from "@nestjs/common";

import type { AuditLogInput } from "../workflows/repository-contracts";
import { AuditRepositoryProvider } from "./audit.repository";

@Injectable()
export class AuditService {
  constructor(@Inject(AuditRepositoryProvider) private readonly repositories: AuditRepositoryProvider) {}

  append(input: AuditLogInput) {
    return this.repositories.repository().append(input);
  }

  list(organizationId: string) {
    return this.repositories.repository().list({ organizationId });
  }
}
