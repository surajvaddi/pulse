type DemoControlEnv = {
  APP_ENV?: string;
  NODE_ENV?: string;
  ENABLE_DEMO_AUTH?: string;
  ENABLE_DEMO_RESET?: string;
  ENABLE_DEMO_SEED_SHORTCUTS?: string;
};

export function isProductionEnvironment(env: DemoControlEnv = process.env) {
  return env.APP_ENV === "production" || env.NODE_ENV === "production";
}

export function demoAuthEnabledForEnv(env: DemoControlEnv = process.env) {
  return !isProductionEnvironment(env) && env.ENABLE_DEMO_AUTH !== "false";
}

export function demoResetEnabledForEnv(env: DemoControlEnv = process.env) {
  return !isProductionEnvironment(env) && env.ENABLE_DEMO_RESET !== "false";
}

export function demoSeedShortcutsEnabledForEnv(env: DemoControlEnv = process.env) {
  return demoAuthEnabledForEnv(env) && env.ENABLE_DEMO_SEED_SHORTCUTS !== "false";
}
