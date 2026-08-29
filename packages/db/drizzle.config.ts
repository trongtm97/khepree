import { defineConfig } from "drizzle-kit";
import { loadRootEnv } from "./src/lib/load-root-env";

loadRootEnv();

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://khepree:khepree_local@localhost:5432/khepree_local",
  },
});
