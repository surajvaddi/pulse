import { ProductionState } from "./production-state";

export default function AppLoading() {
  return <ProductionState kind="loading" busy />;
}
