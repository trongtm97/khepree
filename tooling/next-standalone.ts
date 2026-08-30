import path from "node:path";

/** Standalone output with monorepo file tracing (pnpm workspaces). */
export function withStandalone(appDir: string): {
  output: "standalone";
  outputFileTracingRoot: string;
} {
  return {
    output: "standalone",
    outputFileTracingRoot: path.join(appDir, "../.."),
  };
}
