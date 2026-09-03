/**
 * Phase 21 — Production Studio launch announcement (DRAFT)
 *
 * Run with: npx tsx packages/db/src/seed/phase21-announcement-draft.ts
 * Requires: DATABASE_URL env var and applied migrations (including 0022).
 *
 * STATUS: DRAFT — admin must review and publish. Never auto-publishes.
 *
 * Targeting:
 *   Product: khepree-novel-ai
 *   Platform: windows (initial launch platform)
 *   MinVersion: 2.0.0 (first build containing Production Studio + Campaign Pipeline)
 *   Type: whats_new  → rendered in What's New panel, NOT urgent modal
 *   Severity: info
 *
 * CTA: open_path /release-notes → desktop maps to 'open-release-notes' action
 */

import { and, eq } from "drizzle-orm";
import { createPublicId } from "../lib/ids";
import { requireDb, closeDb } from "../client";
import {
  announcementTranslations,
  products,
  systemAnnouncements,
} from "../schema";

const PRODUCT_SLUG = "khepree-novel-ai";
const PUBLIC_ID = "ann_phase21_production_studio_launch";

async function run(): Promise<void> {
  const db = requireDb();

  // Look up the product by slug (product code column)
  const [product] = await db
    .select({ id: products.id, publicId: products.publicId })
    .from(products)
    .where(eq(products.slug, PRODUCT_SLUG))
    .limit(1);

  if (!product) {
    console.error(`Product '${PRODUCT_SLUG}' not found. Run pnpm db:seed first.`);
    process.exit(1);
  }

  console.log(`Found product: ${product.publicId} (${product.id})`);

  // Idempotent: skip if already exists
  const [existing] = await db
    .select({ id: systemAnnouncements.id, status: systemAnnouncements.status })
    .from(systemAnnouncements)
    .where(eq(systemAnnouncements.publicId, PUBLIC_ID))
    .limit(1);

  if (existing) {
    console.log(`Announcement '${PUBLIC_ID}' already exists (status: ${existing.status}). Skipping.`);
    await closeDb();
    return;
  }

  const [row] = await db
    .insert(systemAnnouncements)
    .values({
      publicId: PUBLIC_ID,
      productId: product.id,
      severity: "info",
      type: "whats_new",
      status: "draft",
      targetPlatform: "windows",
      targetArchitecture: null,
      releaseChannel: "stable",
      minimumAppVersion: "2.0.0",
      maximumAppVersion: null,
      startsAt: null,   // Admin sets schedule before publishing
      expiresAt: null,
      ctaKind: "open_path",
      ctaPayload: { path: "/release-notes" },
    })
    .returning();

  if (!row) throw new Error("Insert failed");

  await db.insert(announcementTranslations).values([
    {
      announcementId: row.id,
      locale: "vi",
      title: "Dịch nhiều truyện trong một chiến dịch",
      body: "Nhập cả thư mục truyện, chọn một Công thức dịch và để Khepree Novel AI tự lập hàng đợi, dịch, kiểm tra, sửa lỗi và xuất kết quả. Trung tâm sản xuất giúp bạn theo dõi mọi truyện; Hộp vấn đề chỉ hiển thị những việc thật sự cần bạn xử lý.",
      ctaLabel: "Khám phá tính năng mới",
    },
    {
      announcementId: row.id,
      locale: "en",
      title: "Translate multiple novels in one campaign",
      body: "Import an entire novel folder, choose a Translation Recipe, and let Khepree Novel AI queue, translate, validate, repair, and export. Production Center tracks every novel, while Attention Inbox only shows issues that truly need you.",
      ctaLabel: "Explore what's new",
    },
  ]);

  console.log(`
✅ DRAFT announcement created: ${PUBLIC_ID}
   Product: ${PRODUCT_SLUG} (${product.id})
   Type: whats_new (What's New panel, not urgent modal)
   Severity: info
   Platform: windows / stable / minVersion 2.0.0
   CTA: open_path /release-notes → desktop 'open-release-notes' action
   Status: DRAFT — requires admin review and publish at /admin/announcements

⚠️  DO NOT publish without admin review.
   Set starts_at and expires_at before publishing.
  `);

  await closeDb();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
