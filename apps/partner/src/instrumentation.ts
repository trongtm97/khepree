export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  const { validateRuntimeEnv } = await import("@khepree/config");
  validateRuntimeEnv();
}
