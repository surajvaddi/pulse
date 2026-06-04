import { ProductionState } from "./production-state";

export default function ForbiddenState() {
  return <ProductionState kind="forbidden" />;
}
