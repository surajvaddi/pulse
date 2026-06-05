const sensitiveKeyPattern = /(authorization|cookie|token|secret|service_role|apikey|api_key|jwt|password)/i;
const bearerPattern = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const secretTokenPattern = /\bsecret-[A-Za-z0-9._~+/=-]+\b/gi;
const sqlPattern = /\b(select|insert|update|delete|drop|alter|truncate)\b[\s\S]{0,160}/gi;

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sensitiveKeyPattern.test(key) ? "[REDACTED]" : redactValue(entry)
      ])
    );
  }
  return value;
}

export function redactHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  return redactValue(headers) as Record<string, unknown>;
}

function redactString(value: string): string {
  return value
    .replaceAll(bearerPattern, "Bearer [REDACTED]")
    .replaceAll(jwtPattern, "[REDACTED_JWT]")
    .replaceAll(secretTokenPattern, "[REDACTED_SECRET]")
    .replaceAll(sqlPattern, "[REDACTED_SQL]");
}
