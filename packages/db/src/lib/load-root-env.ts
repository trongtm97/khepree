import { existsSync } from "node:fs";
import { resolve } from "node:path";

let loaded = false;

/** Load the repo-root `.env` when CLI tools run from `packages/db`. */
export function loadRootEnv(): void {
  if (loaded) return;
  loaded = true;

  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = resolve(dir, ".env");
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
}
