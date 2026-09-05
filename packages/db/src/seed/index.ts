/**
 * Idempotent development seed — safe to rerun.
 * Requires DATABASE_URL and applied migrations.
 */
import { and, eq } from "drizzle-orm";
import { createPublicId } from "../lib/ids";
import { requireDb, closeDb } from "../client";
import {
  featureTranslations,
  features,
  planFeatures,
  planTranslations,
  plans,
  prices,
  productTranslations,
  products,
} from "../schema/catalog";
import {
  partnerPrices,
  partnerTiers,
  partners,
  referrals,
  wallets,
} from "../schema/partner";
import { desktopClients } from "../schema/desktop";

const DEV_SAMPLE_SLUG = "development-sample";

const MARKETING_METADATA = {
  seed: true,
  environment: "development",
  marketing: {
    benefits: [
      {
        title: "Development-only sample",
        description: "This product exists to exercise the catalog domain locally — not for sale.",
      },
      {
        title: "Feature-driven plans",
        description: "Plan limits come from feature keys, not hard-coded plan names.",
      },
    ],
    highlights: [
      {
        title: "Catalog API",
        description: "Products, plans, features, and prices load from Postgres.",
      },
      {
        title: "Multi-platform ready",
        description: "Desktop, web, and mobile capabilities are modeled on the product record.",
      },
    ],
    howItWorks: [
      {
        step: 1,
        title: "Browse the catalog",
        description: "Public pages read active products from the shared ProductService.",
      },
      {
        step: 2,
        title: "Compare plans",
        description: "Pricing cards render from plan billing types and price rows.",
      },
      {
        step: 3,
        title: "Entitlements later",
        description: "Ownership is not faked — account pages show architecture only for now.",
      },
    ],
    faq: [
      {
        question: "Is this a real product?",
        answer: "No. It is a DEVELOPMENT SAMPLE labeled clearly in the name and copy.",
      },
      {
        question: "Why are prices shown?",
        answer: "Sample USD/VND amounts validate formatting and multi-currency architecture only.",
      },
    ],
    relatedContent: [
      { title: "All products", href: "/products" },
      { title: "Pricing overview", href: "/pricing" },
    ],
    cta: {
      headline: "Explore the development sample",
      description: "Use this record to verify database-driven product pages locally.",
      buttonLabel: "View pricing",
      buttonHref: "/pricing",
    },
  },
};

const PRODUCT_COPY = {
  en: {
    name: "DEVELOPMENT SAMPLE — Khepree Platform",
    shortDescription: "Local catalog sample — not a commercial product.",
    description: "Non-commercial sample product for local development only. Not for sale.",
    content:
      "This page is rendered entirely from the product catalog domain. Marketing sections, plans, features, and prices are stored in Postgres and surfaced through ProductService.",
    seoTitle: "DEVELOPMENT SAMPLE — Khepree Platform",
    seoDescription: "Database-driven product page sample for local development.",
  },
  vi: {
    name: "MẪU PHÁT TRIỂN — Khepree Platform",
    shortDescription: "Mẫu catalog cục bộ — không phải sản phẩm thương mại.",
    description: "Sản phẩm mẫu cho môi trường dev. Không bán.",
    content: "Trang này được render từ domain catalog sản phẩm trong Postgres.",
    seoTitle: "MẪU PHÁT TRIỂN — Khepree Platform",
    seoDescription: "Trang sản phẩm mẫu cho phát triển cục bộ.",
  },
};

const LIVESTREAM_AI_SLUG = "khepree-livestream-ai";
const LIVESTREAM_AI_DESKTOP_CLIENT_ID = "khepree-livestream-ai-desktop";
const LIVESTREAM_AI_METADATA = {
  seed: true,
  app: "Khepree Livestream AI",
  productCode: "KHEPREE_LIVESTREAM_AI",
  accessFeatureKey: "livestream_ai.access",
  desktopProtocol: "khepreelivestreamai",
  productType: "desktop-software",
  productCategory: "ai-tools",
  operatingSystems: ["windows"],
};

const TTS_BATCH_AI_SLUG = "khepree-tts-batch-ai";
const TTS_BATCH_AI_DESKTOP_CLIENT_ID = "khepree-tts-batch-ai-desktop";
const TTS_BATCH_AI_METADATA = {
  seed: true,
  app: "Khepree TTS Batch AI",
  productCode: "KHEPREE_TTS_BATCH_AI",
  accessFeatureKey: "tts_batch_ai.access",
  desktopProtocol: "khepreettsbatchai",
  productType: "desktop-software",
  productCategory: "ai-tools",
  operatingSystems: ["windows", "macos"],
};

const BATCH_CHAT_AI_SLUG = "khepree-batch-chat-ai";
const BATCH_CHAT_AI_DESKTOP_CLIENT_ID = "khepree-batch-chat-ai-desktop";
const BATCH_CHAT_AI_METADATA = {
  seed: true,
  app: "Khepree Batch Chat AI",
  productCode: "KHEPREE_BATCH_CHAT_AI",
  accessFeatureKey: "batch_chat_ai.access",
  desktopProtocol: "khepreebatchchatai",
  productType: "desktop-software",
  productCategory: "ai-tools",
  operatingSystems: ["windows"],
};

const BATCH_CHAT_AI_COPY = {
  en: {
    name: "Khepree Batch Chat AI",
    shortDescription:
      "Windows desktop software that sends batch prompts to ChatGPT, Gemini, and other AI platforms.",
    description: `## What it is

Khepree Batch Chat AI is a Windows desktop app for automated batch prompting across ChatGPT, Gemini, NotebookLM, and other AI platforms. Import Excel/TXT, run in batches, export results.

## What it does

- Batch prompting on multiple AI platforms via account-bound browsers.
- Workflows, deferred queues, and batch result export.
- Protect automation behind a valid Khepree license.

## Honest status

This listing binds the desktop app to Khepree identity, entitlement, and device licensing. Not a production-ready claim.

## Requirements

- Windows
- A Khepree account
- One licensed device for the trial plan`,
    content: null,
    seoTitle: "Khepree Batch Chat AI | Khepree",
    seoDescription: "Desktop batch chat AI software, licensed through Khepree.",
  },
  vi: {
    name: "Khepree Batch Chat AI",
    shortDescription:
      "Phần mềm desktop tự động gửi prompt hàng loạt tới ChatGPT, Gemini và các nền tảng AI khác.",
    description: `## Giới thiệu

Khepree Batch Chat AI là ứng dụng desktop Windows tự động hóa việc gửi prompt hàng loạt tới ChatGPT, Gemini, NotebookLM và nhiều nền tảng AI khác. Import Excel/TXT, chạy theo lô, xuất kết quả.

## Tính năng

- Batch prompting trên nhiều nền tảng AI qua trình duyệt gắn tài khoản.
- Workflow, hàng đợi trễ và xuất kết quả theo lô.
- Chạy tự động chỉ mở khi có bản quyền Khepree hợp lệ.

## Trạng thái trung thực

Trang này gắn ứng dụng desktop với danh tính, quyền sử dụng và cấp phép thiết bị của Khepree. Không phải tuyên bố sẵn sàng sản xuất.

## Yêu cầu hệ thống

- Windows
- Tài khoản Khepree
- Một thiết bị được cấp phép cho gói dùng thử`,
    content: null,
    seoTitle: "Khepree Batch Chat AI | Khepree",
    seoDescription: "Phần mềm desktop batch chat AI, bản quyền qua Khepree.",
  },
};

const TTS_BATCH_AI_COPY = {
  en: {
    name: "Khepree TTS Batch AI",
    shortDescription:
      "Desktop software that converts Vietnamese text to speech in batch — VieNeu offline and Edge TTS online.",
    description: `## What it is

Khepree TTS Batch AI is a desktop app for turning long Vietnamese text into speech in batches. Import Excel, TXT, or chapter folders; export WAV/MP3 with VieNeu (offline) or Edge TTS (online).

## What it does

- Batch TTS with no per-character character cap in the client workflow.
- VieNeu v3 Turbo offline engine and Edge TTS online voices.
- Protect synthesis behind a valid Khepree license.

## Honest status

This listing binds the desktop app to Khepree identity, entitlement, and device licensing. Not a production-ready claim.

## Requirements

- Windows or macOS
- A Khepree account
- One licensed device for the trial plan`,
    content: null,
    seoTitle: "Khepree TTS Batch AI | Khepree",
    seoDescription:
      "Desktop batch text-to-speech for Vietnamese, licensed through Khepree.",
  },
  vi: {
    name: "Khepree TTS Batch AI",
    shortDescription:
      "Phần mềm desktop chuyển văn bản tiếng Việt thành giọng nói hàng loạt — VieNeu offline và Edge TTS online.",
    description: `## Giới thiệu

Khepree TTS Batch AI là ứng dụng desktop chuyển văn bản tiếng Việt dài thành giọng nói theo lô. Import Excel, TXT hoặc thư mục chương; xuất WAV/MP3 với VieNeu (offline) hoặc Edge TTS (online).

## Tính năng

- TTS hàng loạt, không giới hạn ký tự theo luồng làm việc trên client.
- Engine VieNeu v3 Turbo offline và giọng Edge TTS online.
- Tổng hợp giọng chỉ mở khi có bản quyền Khepree hợp lệ.

## Trạng thái trung thực

Trang này gắn ứng dụng desktop với danh tính, quyền sử dụng và cấp phép thiết bị của Khepree. Không phải tuyên bố sẵn sàng sản xuất.

## Yêu cầu hệ thống

- Windows hoặc macOS
- Tài khoản Khepree
- Một thiết bị được cấp phép cho gói dùng thử`,
    content: null,
    seoTitle: "Khepree TTS Batch AI | Khepree",
    seoDescription:
      "Phần mềm desktop TTS hàng loạt tiếng Việt, bản quyền qua Khepree.",
  },
};

const LIVESTREAM_AI_COPY = {
  en: {
    name: "Khepree Livestream AI",
    shortDescription:
      "Windows desktop software that helps one operator run a TikTok commerce livestream with human-supervised AI.",
    description: `## What it is

Khepree Livestream AI is a Windows desktop app for one human operator running a TikTok commerce livestream. AI handles repetitive work; the operator can approve, edit, cancel, or take over at any time.

## What it does

- Prioritize buyer-intent comments and draft replies.
- Track sales state and propose the next action.
- Keep protected livestream actions behind a Khepree license.

## Honest status

This listing binds the desktop app to Khepree identity, entitlement, and device licensing. The client is a foundation build, not a production-ready claim. Unofficial site connectors can break when upstream sites change.

## Requirements

- Windows
- A Khepree account
- One licensed device for the trial plan`,
    content: null,
    seoTitle: "Khepree Livestream AI | Khepree",
    seoDescription:
      "Windows desktop software for human-supervised TikTok commerce livestreams, licensed through Khepree.",
  },
  vi: {
    name: "Khepree Livestream AI",
    shortDescription:
      "Phần mềm desktop Windows giúp một người vận hành livestream bán hàng TikTok với AI dưới sự giám sát của con người.",
    description: `## Giới thiệu

Khepree Livestream AI là ứng dụng desktop Windows cho một người vận hành livestream thương mại trên TikTok. AI làm việc lặp lại; người vận hành có thể duyệt, sửa, hủy hoặc tiếp quản bất cứ lúc nào.

## Tính năng

- Ưu tiên bình luận có ý định mua và soạn phản hồi.
- Theo dõi trạng thái bán hàng và đề xuất hành động tiếp theo.
- Các thao tác livestream được bảo vệ chỉ mở khi có bản quyền Khepree hợp lệ.

## Trạng thái trung thực

Trang này gắn ứng dụng desktop với danh tính, quyền sử dụng và cấp phép thiết bị của Khepree. Đây là bản nền tảng, không phải tuyên bố sẵn sàng sản xuất. Kết nối web không chính thức có thể hỏng khi trang nguồn thay đổi.

## Yêu cầu hệ thống

- Windows
- Tài khoản Khepree
- Một thiết bị được cấp phép cho gói dùng thử`,
    content: null,
    seoTitle: "Khepree Livestream AI | Khepree",
    seoDescription:
      "Phần mềm desktop Windows hỗ trợ livestream TikTok có giám sát, bản quyền qua Khepree.",
  },
};

async function upsertFeature(
  db: ReturnType<typeof requireDb>,
  input: {
    key: string;
    nameEn: string;
    nameVi: string;
    valueType: "boolean" | "integer" | "string";
    description?: string;
  },
) {
  const [existing] = await db.select().from(features).where(eq(features.key, input.key)).limit(1);
  const feature =
    existing ??
    (
      await db
        .insert(features)
        .values({
          key: input.key,
          valueType: input.valueType,
          description: input.description,
        })
        .returning()
    )[0];

  if (!feature) throw new Error(`Failed to seed feature ${input.key}`);

  for (const [locale, name] of [
    ["en", input.nameEn],
    ["vi", input.nameVi],
  ] as const) {
    await db
      .insert(featureTranslations)
      .values({ featureId: feature.id, locale, name, description: input.description ?? null })
      .onConflictDoNothing();
  }

  return feature;
}

async function seedLivestreamAi(
  db: ReturnType<typeof requireDb>,
  devicesMax: { id: string },
) {
  const [inserted] = await db
    .insert(products)
    .values({
      publicId: createPublicId("prod"),
      slug: LIVESTREAM_AI_SLUG,
      status: "active",
      platformCapabilities: ["desktop"],
      licensingMode: "LICENSE_KEY_DEVICE",
      metadata: LIVESTREAM_AI_METADATA,
    })
    .onConflictDoNothing({ target: products.slug })
    .returning();
  const product =
    inserted ??
    (await db.select().from(products).where(eq(products.slug, LIVESTREAM_AI_SLUG)).limit(1))[0];
  if (!product) throw new Error("Failed to seed Khepree Livestream AI");

  await db
    .update(products)
    .set({
      status: "active",
      platformCapabilities: ["desktop"],
      licensingMode: "LICENSE_KEY_DEVICE",
      metadata: LIVESTREAM_AI_METADATA,
      updatedAt: new Date(),
    })
    .where(eq(products.id, product.id));

  for (const locale of ["en", "vi"] as const) {
    const copy = LIVESTREAM_AI_COPY[locale];
    await db
      .insert(productTranslations)
      .values({ productId: product.id, locale, ...copy })
      .onConflictDoUpdate({
        target: [productTranslations.productId, productTranslations.locale],
        set: { ...copy, updatedAt: new Date() },
      });
  }

  const access = await upsertFeature(db, {
    key: "livestream_ai.access",
    nameEn: "Livestream AI access",
    nameVi: "Quyền dùng Livestream AI",
    valueType: "boolean",
  });
  const accountRequired = await upsertFeature(db, {
    key: "account.required",
    nameEn: "Khepree account required",
    nameVi: "Yêu cầu tài khoản Khepree",
    valueType: "boolean",
  });

  const trial = await upsertPlan(db, product.id, {
    slug: "trial",
    nameEn: "Trial",
    nameVi: "Dùng thử",
    billingType: "free",
    accessTermDays: 1,
  });
  const monthly = await upsertPlan(db, product.id, {
    slug: "month",
    nameEn: "Monthly",
    nameVi: "Tháng",
    billingType: "one_time",
    accessTermDays: 30,
  });
  const yearly = await upsertPlan(db, product.id, {
    slug: "year",
    nameEn: "Yearly",
    nameVi: "Năm",
    billingType: "one_time",
    accessTermDays: 365,
  });

  await db
    .update(plans)
    .set({ internalCode: "LIVESTREAM_AI_FREE_TRIAL", status: "active", updatedAt: new Date() })
    .where(eq(plans.id, trial.id));
  await db
    .update(plans)
    .set({ internalCode: "LIVESTREAM_AI_MONTHLY", status: "active", updatedAt: new Date() })
    .where(eq(plans.id, monthly.id));
  await db
    .update(plans)
    .set({ internalCode: "LIVESTREAM_AI_YEARLY", status: "active", updatedAt: new Date() })
    .where(eq(plans.id, yearly.id));

  for (const plan of [trial, monthly, yearly]) {
    await upsertPlanFeatureValue(db, plan.id, access.id, "boolean", true);
    await upsertPlanFeatureValue(db, plan.id, devicesMax.id, "integer", 1);
    await upsertPlanFeatureValue(db, plan.id, accountRequired.id, "boolean", true);
  }

  await upsertPrice(db, monthly.id, {
    publicId: "price_livestream_ai_month_vnd",
    currency: "VND",
    amountMinor: 299_000n,
    interval: "month",
    region: "VN",
  });
  await upsertPrice(db, yearly.id, {
    publicId: "price_livestream_ai_year_vnd",
    currency: "VND",
    amountMinor: 2_799_000n,
    interval: "year",
    region: "VN",
  });

  await db
    .update(products)
    .set({
      metadata: { ...LIVESTREAM_AI_METADATA, recommendedPlanPublicId: yearly.publicId },
      updatedAt: new Date(),
    })
    .where(eq(products.id, product.id));

  await db
    .insert(desktopClients)
    .values({
      clientId: LIVESTREAM_AI_DESKTOP_CLIENT_ID,
      productId: product.id,
      displayName: "Khepree Livestream AI",
      allowedRedirectUris: ["khepreelivestreamai://auth/callback"],
      status: "active",
    })
    .onConflictDoNothing({ target: desktopClients.clientId });

  console.log(`[seed] Product ready: ${product.slug} (${product.publicId})`);
  console.log(
    `[seed] Plans: trial (free 1d), month 299000 VND / 30d, year 2799000 VND / 365d`,
  );
  console.log(`[seed] Desktop client registered: ${LIVESTREAM_AI_DESKTOP_CLIENT_ID}`);
}

async function seedTtsBatchAi(
  db: ReturnType<typeof requireDb>,
  devicesMax: { id: string },
) {
  const [inserted] = await db
    .insert(products)
    .values({
      publicId: createPublicId("prod"),
      slug: TTS_BATCH_AI_SLUG,
      status: "active",
      platformCapabilities: ["desktop"],
      licensingMode: "LICENSE_KEY_DEVICE",
      metadata: TTS_BATCH_AI_METADATA,
    })
    .onConflictDoNothing({ target: products.slug })
    .returning();
  const product =
    inserted ??
    (await db.select().from(products).where(eq(products.slug, TTS_BATCH_AI_SLUG)).limit(1))[0];
  if (!product) throw new Error("Failed to seed Khepree TTS Batch AI");

  await db
    .update(products)
    .set({
      status: "active",
      platformCapabilities: ["desktop"],
      licensingMode: "LICENSE_KEY_DEVICE",
      metadata: TTS_BATCH_AI_METADATA,
      updatedAt: new Date(),
    })
    .where(eq(products.id, product.id));

  for (const locale of ["en", "vi"] as const) {
    const copy = TTS_BATCH_AI_COPY[locale];
    await db
      .insert(productTranslations)
      .values({ productId: product.id, locale, ...copy })
      .onConflictDoUpdate({
        target: [productTranslations.productId, productTranslations.locale],
        set: { ...copy, updatedAt: new Date() },
      });
  }

  const access = await upsertFeature(db, {
    key: "tts_batch_ai.access",
    nameEn: "TTS Batch AI access",
    nameVi: "Quyền dùng TTS Batch AI",
    valueType: "boolean",
  });
  const accountRequired = await upsertFeature(db, {
    key: "account.required",
    nameEn: "Khepree account required",
    nameVi: "Yêu cầu tài khoản Khepree",
    valueType: "boolean",
  });

  const trial = await upsertPlan(db, product.id, {
    slug: "trial",
    nameEn: "Trial",
    nameVi: "Dùng thử",
    billingType: "free",
    accessTermDays: 1,
  });
  const monthly = await upsertPlan(db, product.id, {
    slug: "month",
    nameEn: "Monthly",
    nameVi: "Tháng",
    billingType: "one_time",
    accessTermDays: 30,
  });
  const yearly = await upsertPlan(db, product.id, {
    slug: "year",
    nameEn: "Yearly",
    nameVi: "Năm",
    billingType: "one_time",
    accessTermDays: 365,
  });

  await db
    .update(plans)
    .set({ internalCode: "TTS_BATCH_AI_FREE_TRIAL", status: "active", updatedAt: new Date() })
    .where(eq(plans.id, trial.id));
  await db
    .update(plans)
    .set({ internalCode: "TTS_BATCH_AI_MONTHLY", status: "active", updatedAt: new Date() })
    .where(eq(plans.id, monthly.id));
  await db
    .update(plans)
    .set({ internalCode: "TTS_BATCH_AI_YEARLY", status: "active", updatedAt: new Date() })
    .where(eq(plans.id, yearly.id));

  for (const plan of [trial, monthly, yearly]) {
    await upsertPlanFeatureValue(db, plan.id, access.id, "boolean", true);
    await upsertPlanFeatureValue(db, plan.id, devicesMax.id, "integer", 1);
    await upsertPlanFeatureValue(db, plan.id, accountRequired.id, "boolean", true);
  }

  await upsertPrice(db, monthly.id, {
    publicId: "price_tts_batch_ai_month_vnd",
    currency: "VND",
    amountMinor: 49_000n,
    interval: "month",
    region: "VN",
  });
  await upsertPrice(db, yearly.id, {
    publicId: "price_tts_batch_ai_year_vnd",
    currency: "VND",
    amountMinor: 499_000n,
    interval: "year",
    region: "VN",
  });

  await db
    .update(products)
    .set({
      metadata: { ...TTS_BATCH_AI_METADATA, recommendedPlanPublicId: yearly.publicId },
      updatedAt: new Date(),
    })
    .where(eq(products.id, product.id));

  await db
    .insert(desktopClients)
    .values({
      clientId: TTS_BATCH_AI_DESKTOP_CLIENT_ID,
      productId: product.id,
      displayName: "Khepree TTS Batch AI",
      allowedRedirectUris: ["khepreettsbatchai://auth/callback"],
      status: "active",
    })
    .onConflictDoNothing({ target: desktopClients.clientId });

  console.log(`[seed] Product ready: ${product.slug} (${product.publicId})`);
  console.log(
    `[seed] Plans: trial (free 1d), month 49000 VND / 30d, year 499000 VND / 365d`,
  );
  console.log(`[seed] Desktop client registered: ${TTS_BATCH_AI_DESKTOP_CLIENT_ID}`);
}

async function seedBatchChatAi(
  db: ReturnType<typeof requireDb>,
  devicesMax: { id: string },
) {
  const [inserted] = await db
    .insert(products)
    .values({
      publicId: createPublicId("prod"),
      slug: BATCH_CHAT_AI_SLUG,
      status: "active",
      platformCapabilities: ["desktop"],
      licensingMode: "LICENSE_KEY_DEVICE",
      metadata: BATCH_CHAT_AI_METADATA,
    })
    .onConflictDoNothing({ target: products.slug })
    .returning();
  const product =
    inserted ??
    (await db.select().from(products).where(eq(products.slug, BATCH_CHAT_AI_SLUG)).limit(1))[0];
  if (!product) throw new Error("Failed to seed Khepree Batch Chat AI");

  await db
    .update(products)
    .set({
      status: "active",
      platformCapabilities: ["desktop"],
      licensingMode: "LICENSE_KEY_DEVICE",
      metadata: BATCH_CHAT_AI_METADATA,
      updatedAt: new Date(),
    })
    .where(eq(products.id, product.id));

  for (const locale of ["en", "vi"] as const) {
    const copy = BATCH_CHAT_AI_COPY[locale];
    await db
      .insert(productTranslations)
      .values({ productId: product.id, locale, ...copy })
      .onConflictDoUpdate({
        target: [productTranslations.productId, productTranslations.locale],
        set: { ...copy, updatedAt: new Date() },
      });
  }

  const access = await upsertFeature(db, {
    key: "batch_chat_ai.access",
    nameEn: "Batch Chat AI access",
    nameVi: "Quyền dùng Batch Chat AI",
    valueType: "boolean",
  });
  const accountRequired = await upsertFeature(db, {
    key: "account.required",
    nameEn: "Khepree account required",
    nameVi: "Yêu cầu tài khoản Khepree",
    valueType: "boolean",
  });

  const trial = await upsertPlan(db, product.id, {
    slug: "trial",
    nameEn: "Trial",
    nameVi: "Dùng thử",
    billingType: "free",
    accessTermDays: 1,
  });
  const monthly = await upsertPlan(db, product.id, {
    slug: "month",
    nameEn: "Monthly",
    nameVi: "Tháng",
    billingType: "one_time",
    accessTermDays: 30,
  });
  const yearly = await upsertPlan(db, product.id, {
    slug: "year",
    nameEn: "Yearly",
    nameVi: "Năm",
    billingType: "one_time",
    accessTermDays: 365,
  });

  await db
    .update(plans)
    .set({ internalCode: "BATCH_CHAT_AI_FREE_TRIAL", status: "active", updatedAt: new Date() })
    .where(eq(plans.id, trial.id));
  await db
    .update(plans)
    .set({ internalCode: "BATCH_CHAT_AI_MONTHLY", status: "active", updatedAt: new Date() })
    .where(eq(plans.id, monthly.id));
  await db
    .update(plans)
    .set({ internalCode: "BATCH_CHAT_AI_YEARLY", status: "active", updatedAt: new Date() })
    .where(eq(plans.id, yearly.id));

  for (const plan of [trial, monthly, yearly]) {
    await upsertPlanFeatureValue(db, plan.id, access.id, "boolean", true);
    await upsertPlanFeatureValue(db, plan.id, devicesMax.id, "integer", 1);
    await upsertPlanFeatureValue(db, plan.id, accountRequired.id, "boolean", true);
  }

  await upsertPrice(db, monthly.id, {
    publicId: "price_batch_chat_ai_month_vnd",
    currency: "VND",
    amountMinor: 99_000n,
    interval: "month",
    region: "VN",
  });
  await upsertPrice(db, yearly.id, {
    publicId: "price_batch_chat_ai_year_vnd",
    currency: "VND",
    amountMinor: 900_000n,
    interval: "year",
    region: "VN",
  });

  await db
    .update(products)
    .set({
      metadata: { ...BATCH_CHAT_AI_METADATA, recommendedPlanPublicId: yearly.publicId },
      updatedAt: new Date(),
    })
    .where(eq(products.id, product.id));

  await db
    .insert(desktopClients)
    .values({
      clientId: BATCH_CHAT_AI_DESKTOP_CLIENT_ID,
      productId: product.id,
      displayName: "Khepree Batch Chat AI",
      allowedRedirectUris: ["khepreebatchchatai://auth/callback"],
      status: "active",
    })
    .onConflictDoNothing({ target: desktopClients.clientId });

  console.log(`[seed] Product ready: ${product.slug} (${product.publicId})`);
  console.log(
    `[seed] Plans: trial (free 1d), month 99000 VND / 30d, year 900000 VND / 365d`,
  );
  console.log(`[seed] Desktop client registered: ${BATCH_CHAT_AI_DESKTOP_CLIENT_ID}`);
}

async function upsertPlan(
  db: ReturnType<typeof requireDb>,
  productId: string,
  input: {
    slug: string;
    nameEn: string;
    nameVi: string;
    billingType: "free" | "one_time" | "recurring" | "perpetual" | "custom";
    accessTermDays?: number | null;
  },
) {
  const [existing] = await db
    .select()
    .from(plans)
    .where(and(eq(plans.productId, productId), eq(plans.slug, input.slug)))
    .limit(1);

  const plan =
    existing ??
    (
      await db
        .insert(plans)
        .values({
          publicId: createPublicId("plan"),
          productId,
          slug: input.slug,
          billingType: input.billingType,
          accessTermDays: input.accessTermDays ?? null,
          status: "active",
        })
        .returning()
    )[0];

  if (!plan) throw new Error(`Failed to seed plan ${input.slug}`);

  await db
    .update(plans)
    .set({
      billingType: input.billingType,
      accessTermDays: input.accessTermDays ?? null,
      updatedAt: new Date(),
    })
    .where(eq(plans.id, plan.id));

  for (const [locale, name] of [
    ["en", input.nameEn],
    ["vi", input.nameVi],
  ] as const) {
    await db
      .insert(planTranslations)
      .values({ planId: plan.id, locale, name })
      .onConflictDoNothing();
  }

  return plan;
}

async function upsertPlanFeatureValue(
  db: ReturnType<typeof requireDb>,
  planId: string,
  featureId: string,
  valueType: "boolean" | "integer" | "string",
  value: boolean | number | string,
) {
  const columns =
    valueType === "boolean"
      ? { booleanValue: value as boolean, integerValue: null, stringValue: null }
      : valueType === "integer"
        ? { booleanValue: null, integerValue: value as number, stringValue: null }
        : { booleanValue: null, integerValue: null, stringValue: value as string };

  await db
    .insert(planFeatures)
    .values({ planId, featureId, ...columns })
    .onConflictDoNothing();
}

async function upsertPrice(
  db: ReturnType<typeof requireDb>,
  planId: string,
  input: {
    publicId: string;
    currency: string;
    amountMinor: bigint;
    interval?: string | null;
    region?: string | null;
  },
) {
  await db
    .insert(prices)
    .values({
      publicId: input.publicId,
      planId,
      currency: input.currency,
      amountMinor: input.amountMinor,
      interval: input.interval ?? null,
      region: input.region ?? null,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: prices.publicId,
      set: {
        amountMinor: input.amountMinor,
        interval: input.interval ?? null,
        region: input.region ?? null,
        isActive: true,
        updatedAt: new Date(),
      },
    });
}

async function seed() {
  const db = requireDb();

  const [inserted] = await db
    .insert(products)
    .values({
      publicId: createPublicId("prod"),
      slug: DEV_SAMPLE_SLUG,
      status: "hidden",
      platformCapabilities: ["web", "desktop", "mobile"],
      licensingMode: "LICENSE_KEY_DEVICE",
      metadata: MARKETING_METADATA,
    })
    .onConflictDoNothing({ target: products.slug })
    .returning();

  const product =
    inserted ??
    (await db.select().from(products).where(eq(products.slug, DEV_SAMPLE_SLUG)).limit(1))[0];

  if (!product) throw new Error("Failed to seed development sample product");

  await db
    .update(products)
    .set({ status: "hidden", metadata: MARKETING_METADATA, updatedAt: new Date() })
    .where(eq(products.slug, DEV_SAMPLE_SLUG));

  for (const locale of ["en", "vi"] as const) {
    const copy = PRODUCT_COPY[locale];
    await db
      .insert(productTranslations)
      .values({ productId: product.id, locale, ...copy })
      .onConflictDoUpdate({
        target: [productTranslations.productId, productTranslations.locale],
        set: { ...copy, updatedAt: new Date() },
      });
  }

  const apiAccess = await upsertFeature(db, {
    key: "api_access",
    nameEn: "API access",
    nameVi: "Truy cập API",
    valueType: "boolean",
  });
  const teamMembers = await upsertFeature(db, {
    key: "team_members",
    nameEn: "Team members",
    nameVi: "Thành viên nhóm",
    valueType: "integer",
  });
  const storageGb = await upsertFeature(db, {
    key: "storage_gb",
    nameEn: "Storage (GB)",
    nameVi: "Dung lượng (GB)",
    valueType: "integer",
  });
  const devicesMax = await upsertFeature(db, {
    key: "devices.max",
    nameEn: "Max devices",
    nameVi: "Số thiết bị tối đa",
    valueType: "integer",
  });

  const freePlan = await upsertPlan(db, product.id, {
    slug: "sample-free",
    nameEn: "Sample Free",
    nameVi: "Mẫu Miễn phí",
    billingType: "free",
  });
  const proPlan = await upsertPlan(db, product.id, {
    slug: "sample-pro",
    nameEn: "Sample Pro",
    nameVi: "Mẫu Pro",
    billingType: "one_time",
    accessTermDays: 365,
  });
  const lifetimePlan = await upsertPlan(db, product.id, {
    slug: "sample-lifetime",
    nameEn: "Sample Lifetime",
    nameVi: "Mẫu Trọn đời",
    billingType: "one_time",
  });
  const enterprisePlan = await upsertPlan(db, product.id, {
    slug: "sample-enterprise",
    nameEn: "Sample Enterprise",
    nameVi: "Mẫu Doanh nghiệp",
    billingType: "custom",
  });

  await upsertPlanFeatureValue(db, freePlan.id, apiAccess.id, "boolean", false);
  await upsertPlanFeatureValue(db, freePlan.id, teamMembers.id, "integer", 1);
  await upsertPlanFeatureValue(db, freePlan.id, storageGb.id, "integer", 1);
  await upsertPlanFeatureValue(db, freePlan.id, devicesMax.id, "integer", 1);

  await upsertPlanFeatureValue(db, proPlan.id, apiAccess.id, "boolean", true);
  await upsertPlanFeatureValue(db, proPlan.id, teamMembers.id, "integer", 5);
  await upsertPlanFeatureValue(db, proPlan.id, storageGb.id, "integer", 25);
  await upsertPlanFeatureValue(db, proPlan.id, devicesMax.id, "integer", 5);

  await upsertPlanFeatureValue(db, lifetimePlan.id, apiAccess.id, "boolean", true);
  await upsertPlanFeatureValue(db, lifetimePlan.id, teamMembers.id, "integer", 3);
  await upsertPlanFeatureValue(db, lifetimePlan.id, storageGb.id, "integer", 10);
  await upsertPlanFeatureValue(db, lifetimePlan.id, devicesMax.id, "integer", 3);

  await upsertPlanFeatureValue(db, enterprisePlan.id, apiAccess.id, "boolean", true);
  await upsertPlanFeatureValue(db, enterprisePlan.id, teamMembers.id, "integer", 100);
  await upsertPlanFeatureValue(db, enterprisePlan.id, storageGb.id, "integer", 500);
  await upsertPlanFeatureValue(db, enterprisePlan.id, devicesMax.id, "integer", 100);

  await upsertPrice(db, proPlan.id, {
    publicId: "price_sample_pro_usd",
    currency: "USD",
    amountMinor: 1900n,
    interval: "year",
  });
  await upsertPrice(db, proPlan.id, {
    publicId: "price_sample_pro_vnd",
    currency: "VND",
    amountMinor: 599000n,
    interval: "year",
    region: "VN",
  });
  await upsertPrice(db, lifetimePlan.id, {
    publicId: "price_sample_lifetime_usd",
    currency: "USD",
    amountMinor: 19900n,
    interval: null,
  });
  await upsertPrice(db, lifetimePlan.id, {
    publicId: "price_sample_lifetime_vnd",
    currency: "VND",
    amountMinor: 499000n,
    interval: null,
    region: "VN",
  });

  const [tierInserted] = await db
    .insert(partnerTiers)
    .values({ slug: "standard", name: "Standard", commissionBps: 1000 })
    .onConflictDoNothing({ target: partnerTiers.slug })
    .returning();
  const tier =
    tierInserted ??
    (await db.select().from(partnerTiers).where(eq(partnerTiers.slug, "standard")).limit(1))[0];
  if (!tier) throw new Error("Failed to seed partner tier");

  const PARTNER_SLUG = "development-sample-partner";
  const [partnerInserted] = await db
    .insert(partners)
    .values({
      publicId: createPublicId("ptr"),
      slug: PARTNER_SLUG,
      name: "DEVELOPMENT SAMPLE Partner",
      tierId: tier.id,
      status: "active",
      modes: ["REFERRAL", "RESELLER"],
      allowNegativeBalance: false,
    })
    .onConflictDoNothing({ target: partners.slug })
    .returning();
  const partner =
    partnerInserted ??
    (await db.select().from(partners).where(eq(partners.slug, PARTNER_SLUG)).limit(1))[0];
  if (!partner) throw new Error("Failed to seed development partner");

  await db
    .insert(wallets)
    .values({ partnerId: partner.id, balanceMinor: 0n, currency: "USD" })
    .onConflictDoNothing({ target: wallets.partnerId });

  await db
    .insert(partnerPrices)
    .values({
      partnerId: partner.id,
      planId: proPlan.id,
      amountMinor: 1500n,
      currency: "USD",
    })
    .onConflictDoNothing();

  await db
    .insert(referrals)
    .values({
      publicId: createPublicId("ref"),
      partnerId: partner.id,
      code: "KHDEV001",
      label: "Development sample",
    })
    .onConflictDoNothing({ target: referrals.code });

  console.log(`[seed] Development sample product ready: ${product.slug} (${product.publicId})`);

  const DEV_DESKTOP_CLIENT_ID = "dev-desktop-sample";
  await db
    .insert(desktopClients)
    .values({
      clientId: DEV_DESKTOP_CLIENT_ID,
      productId: product.id,
      displayName: "Development Desktop Sample",
      allowedRedirectUris: ["khepree-dev://auth/callback", "http://127.0.0.1:0/auth/callback"],
      status: "active",
    })
    .onConflictDoNothing({ target: desktopClients.clientId });
  console.log(`[seed] Desktop client registered: ${DEV_DESKTOP_CLIENT_ID}`);

  const NOVEL_AI_SLUG = "novel-ai";
  const [novelAiProductInserted] = await db
    .insert(products)
    .values({
      publicId: createPublicId("prod"),
      slug: NOVEL_AI_SLUG,
      status: "hidden",
      platformCapabilities: ["desktop"],
      licensingMode: "LICENSE_KEY_DEVICE",
      metadata: { seed: true, app: "Khepree Novel AI" },
    })
    .onConflictDoNothing({ target: products.slug })
    .returning();
  const novelAiProduct =
    novelAiProductInserted ??
    (await db.select().from(products).where(eq(products.slug, NOVEL_AI_SLUG)).limit(1))[0];

  if (novelAiProduct) {
    const NOVEL_AI_DESKTOP_CLIENT_ID = "khepree-novel-ai-desktop";
    await db
      .insert(desktopClients)
      .values({
        clientId: NOVEL_AI_DESKTOP_CLIENT_ID,
        productId: novelAiProduct.id,
        displayName: "Khepree Novel AI",
        allowedRedirectUris: ["khepree-novel-ai://auth/callback"],
        status: "active",
      })
      .onConflictDoNothing({ target: desktopClients.clientId });
    console.log(`[seed] Desktop client registered: ${NOVEL_AI_DESKTOP_CLIENT_ID}`);
  }

  await seedLivestreamAi(db, devicesMax);
  await seedTtsBatchAi(db, devicesMax);
  await seedBatchChatAi(db, devicesMax);

  console.log(
    `[seed] Partner ${partner.slug} is ACTIVE (referral+reseller). Attach a partner_memberships row after creating an account.`,
  );
  await closeDb();
}

seed().catch(async (error) => {
  console.error("[seed] Failed:", error);
  await closeDb();
  process.exit(1);
});
