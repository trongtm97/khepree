import { OutboxWorker } from "@khepree/events";
import { createKhepreePlatform, type CreateKhepreePlatformOverrides } from "./create-platform";

/** Composition-root outbox worker wired with commerce entitlement/licensing/partner handlers. */
export function createKhepreeOutboxWorker(
  overrides: CreateKhepreePlatformOverrides = {},
): OutboxWorker {
  const { commerce } = createKhepreePlatform(overrides);
  const worker = commerce.getOutboxWorker();
  if (!worker) {
    throw new Error("Outbox worker is not configured — DATABASE_URL required");
  }
  return worker;
}
