import type { Database } from "../client";

type TransactionCallback<T> = (tx: Database) => Promise<T>;

/** Run work inside a single database transaction. */
export async function withTransaction<T>(db: Database, fn: TransactionCallback<T>): Promise<T> {
  return db.transaction(async (tx) => fn(tx as Database));
}
