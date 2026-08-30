export const PLATFORM_PACKAGE = "@khepree/platform" as const;

export { createKhepreePlatform, marketingReferralBaseUrl, type CreateKhepreePlatformOverrides } from "./create-platform";
export { createKhepreeOutboxWorker } from "./create-outbox-worker";
export { fetchOutboxHealthMetrics } from "./outbox-health";
export type { OutboxHealthMetrics } from "@khepree/events";
