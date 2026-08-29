export const RESELLER_PACKAGE = "@khepree/reseller" as const;

export { PartnerError, isPartnerError } from "./errors";
export { signedLedgerDelta } from "./ledger";
export { hashVisitorId, newReferralCode, newVisitorId } from "./privacy";
export { MemoryPartnerRepository } from "./store";
export { DrizzlePartnerRepository, DrizzlePlanCatalog, DrizzleUserDirectory } from "./drizzle-store";
export {
  PartnerService,
  createPartnerService,
  expiresAtForPlan,
  type CreatePartnerServiceOverrides,
  type PartnerActor,
} from "./service";
export { createPartnerCommerceHooks } from "./commerce-hooks";
export { createPartnerPlatform } from "./platform";
export { hasMode } from "./types";
export type {
  CommissionRecord,
  CommissionStatus,
  MembershipRecord,
  PartnerCustomerRecord,
  PartnerIssueRecord,
  PartnerPriceRecord,
  PartnerRecord,
  PartnerStatus,
  PlanCatalog,
  ReferralCodeRecord,
  UserDirectory,
  WalletRecord,
  WalletTxRecord,
  WalletTxType,
} from "./types";
