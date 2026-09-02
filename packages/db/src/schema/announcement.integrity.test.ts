import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  announcementReceipts,
  announcementTranslations,
  systemAnnouncements,
} from "./announcement";

describe("announcement schema integrity", () => {
  it("scopes receipt uniqueness to announcement + user", () => {
    const config = getTableConfig(announcementReceipts);
    const constraint = config.uniqueConstraints.find(
      (row) => row.name === "announcement_receipt_announcement_user_unique",
    );
    expect(constraint?.columns.map((column) => column.name)).toEqual([
      "announcement_id",
      "user_id",
    ]);
  });

  it("scopes translation uniqueness to announcement + locale", () => {
    const config = getTableConfig(announcementTranslations);
    const constraint = config.uniqueConstraints.find(
      (row) => row.name === "announcement_translation_announcement_locale_unique",
    );
    expect(constraint).toBeDefined();
  });

  it("indexes published targeting and receipt lookups", () => {
    const announcementConfig = getTableConfig(systemAnnouncements);
    const receiptConfig = getTableConfig(announcementReceipts);
    const announcementIndexes = announcementConfig.indexes.map((row) => row.config.name);
    const receiptIndexes = receiptConfig.indexes.map((row) => row.config.name);
    expect(announcementIndexes).toContain("system_announcements_status_starts_at_idx");
    expect(announcementIndexes).toContain("system_announcements_product_status_idx");
    expect(receiptIndexes).toContain("announcement_receipts_user_id_idx");
  });
});
