import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { isDatabaseConfigured, getEnv } from "@khepree/config";
import { loadRootEnv } from "./lib/load-root-env";
import { schema } from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: Database | null = null;

export function getDb(): Database | null {
  loadRootEnv();
  const env = getEnv();
  if (!isDatabaseConfigured(env)) {
    return null;
  }

  if (!dbInstance) {
    client = postgres(env.DATABASE_URL!, { max: 10 });
    dbInstance = drizzle(client, { schema });
  }

  return dbInstance;
}

export function requireDb(): Database {
  const db = getDb();
  if (!db) {
    throw new Error(
      "DATABASE_URL is not configured. Set it in .env — status: NOT CONFIGURED",
    );
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    dbInstance = null;
  }
}
