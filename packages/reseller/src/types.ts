import type { PartnerMode } from "@khepree/db";
import type { PartnerRole } from "@khepree/types";

export type { PartnerMode };

export type PartnerStatus = "pending" | "active" | "suspended" | "rejected";
export type WalletTxType = "CREDIT" | "DEBIT" | "ADJUSTMENT" | "REFUND" | "REVERSAL";
export type CommissionStatus = "pending" | "approved" | "available" | "paid" | "reversed";

export interface PartnerRecord {
  id: string;
  publicId: string;
  slug: string;
  name: string;
  tierId: string | null;
  status: PartnerStatus;
  modes: PartnerMode[];
  allowNegativeBalance: boolean;
  commissionBps: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MembershipRecord {
  partnerId: string;
  userId: string;
  role: PartnerRole;
}

export interface WalletRecord {
  id: string;
  partnerId: string;
  balanceMinor: bigint;
  currency: string;
}

export interface WalletTxRecord {
  id: string;
  publicId: string;
  walletId: string;
  amountMinor: bigint;
  type: WalletTxType;
  idempotencyKey: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: Date;
}

export interface ReferralCodeRecord {
  id: string;
  publicId: string;
  partnerId: string;
  code: string;
  label: string | null;
}

export interface CommissionRecord {
  id: string;
  publicId: string;
  partnerId: string;
  orderId: string | null;
  amountMinor: bigint;
  currency: string;
  status: CommissionStatus;
}

export interface PartnerCustomerRecord {
  id: string;
  publicId: string;
  partnerId: string;
  userId: string;
}

export interface PartnerIssueRecord {
  id: string;
  publicId: string;
  partnerId: string;
  customerUserId: string;
  entitlementId: string;
  planId: string;
  amountMinor: bigint;
  currency: string;
  kind: string;
  idempotencyKey: string;
}

export interface PartnerPriceRecord {
  partnerId: string;
  planId: string;
  amountMinor: bigint;
  currency: string;
}

export interface UserDirectory {
  findByEmail(email: string): Promise<{ id: string; email: string; name: string } | null>;
  getById(id: string): Promise<{ id: string; email: string; name: string } | null>;
}

export interface PlanCatalog {
  getPlan(planId: string): Promise<{
    id: string;
    slug: string;
    productId: string;
    productSlug: string;
    billingType: string;
  } | null>;
}

export function hasMode(partner: PartnerRecord, mode: PartnerMode): boolean {
  return partner.modes.includes(mode);
}
