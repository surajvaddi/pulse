export type ExpectedToolArguments = {
  required: string[];
  optional?: string[];
  protected?: string[];
  exact?: Record<string, unknown>;
};

export type ArgumentScore = {
  valid: boolean;
  score: number;
  missing: string[];
  extra: string[];
  protectedOverrides: string[];
  incorrectExactValues: string[];
};

export function scoreToolArguments(
  expected: ExpectedToolArguments,
  actual: Record<string, unknown>
): ArgumentScore {
  const allowed = new Set([
    ...expected.required,
    ...(expected.optional ?? []),
    ...Object.keys(expected.exact ?? {})
  ]);
  const missing = expected.required.filter(
    (key) => actual[key] === undefined || actual[key] === null || actual[key] === ""
  );
  const extra = Object.keys(actual).filter((key) => !allowed.has(key));
  const protectedOverrides = (expected.protected ?? []).filter(
    (key) => Object.prototype.hasOwnProperty.call(actual, key)
  );
  const incorrectExactValues = Object.entries(expected.exact ?? {})
    .filter(([key, value]) => JSON.stringify(actual[key]) !== JSON.stringify(value))
    .map(([key]) => key);
  const issueCount =
    missing.length +
    extra.length +
    protectedOverrides.length +
    incorrectExactValues.length;
  const denominator = Math.max(
    expected.required.length +
      (expected.optional?.length ?? 0) +
      Object.keys(expected.exact ?? {}).length,
    1
  );
  return {
    valid: issueCount === 0,
    score: Math.max(0, 1 - issueCount / denominator),
    missing,
    extra,
    protectedOverrides,
    incorrectExactValues
  };
}
