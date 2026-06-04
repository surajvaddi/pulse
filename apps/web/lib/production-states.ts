export type ProductionStateKind = "loading" | "empty" | "error" | "forbidden";

export type ProductionStateCopy = {
  eyebrow: string;
  title: string;
  message: string;
};

export const productionStateCopy: Record<ProductionStateKind, ProductionStateCopy> = {
  loading: {
    eyebrow: "Loading",
    title: "Preparing workspace",
    message: "PulseShift is loading scoped workforce data."
  },
  empty: {
    eyebrow: "Empty",
    title: "Nothing to review",
    message: "No records match the current role, scope, or filter."
  },
  error: {
    eyebrow: "Error",
    title: "Workspace data did not load",
    message: "Confirm the API is running, then retry the view."
  },
  forbidden: {
    eyebrow: "Forbidden",
    title: "Permission scope required",
    message: "Switch to an authorized account or return to an allowed workspace."
  }
};

export function productionStateFor(kind: ProductionStateKind, override?: Partial<ProductionStateCopy>) {
  return { ...productionStateCopy[kind], ...override };
}
