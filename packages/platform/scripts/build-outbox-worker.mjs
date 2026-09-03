import * as esbuild from "esbuild";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
mkdirSync("dist", { recursive: true });

await esbuild.build({
  entryPoints: ["src/run-outbox-cli.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "cjs",
  outfile: "dist/outbox-worker.cjs",
  logLevel: "info",
  alias: {
    sharp: join(here, "sharp-stub.cjs"),
  },
});
