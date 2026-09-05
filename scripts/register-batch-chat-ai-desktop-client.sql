-- Idempotent: register Khepree Batch Chat AI catalog product + desktop OAuth client.
-- Matches khepree-batch-chat-ai: slug, client_id, protocol/callback.
-- Plans: trial 1d free / month 99_000 VND / year 900_000 VND.
-- Safe to rerun — uses WHERE NOT EXISTS / ON CONFLICT patterns.

INSERT INTO products (public_id, slug, status, platform_capabilities, licensing_mode, metadata)
SELECT
  'prod_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  'khepree-batch-chat-ai',
  'active',
  '["desktop"]'::jsonb,
  'LICENSE_KEY_DEVICE',
  '{
    "app": "Khepree Batch Chat AI",
    "productCode": "KHEPREE_BATCH_CHAT_AI",
    "accessFeatureKey": "batch_chat_ai.access",
    "desktopProtocol": "khepreebatchchatai",
    "productType": "desktop-software",
    "productCategory": "ai-tools",
    "operatingSystems": ["windows"]
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'khepree-batch-chat-ai');

UPDATE products
SET
  status = 'active',
  platform_capabilities = '["desktop"]'::jsonb,
  licensing_mode = 'LICENSE_KEY_DEVICE',
  metadata = metadata || '{
    "app": "Khepree Batch Chat AI",
    "productCode": "KHEPREE_BATCH_CHAT_AI",
    "accessFeatureKey": "batch_chat_ai.access",
    "desktopProtocol": "khepreebatchchatai",
    "productType": "desktop-software",
    "productCategory": "ai-tools",
    "operatingSystems": ["windows"]
  }'::jsonb,
  updated_at = now()
WHERE slug = 'khepree-batch-chat-ai';

INSERT INTO product_translations (
  product_id, locale, name, short_description, description, seo_title, seo_description
)
SELECT
  p.id,
  'vi',
  'Khepree Batch Chat AI',
  'Phần mềm desktop tự động gửi prompt hàng loạt tới ChatGPT, Gemini và các nền tảng AI khác.',
  E'## Giới thiệu

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
- Một thiết bị được cấp phép cho gói dùng thử',
  'Khepree Batch Chat AI | Khepree',
  'Phần mềm desktop batch chat AI, bản quyền qua Khepree.'
FROM products p
WHERE p.slug = 'khepree-batch-chat-ai'
ON CONFLICT (product_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  updated_at = now();

INSERT INTO product_translations (
  product_id, locale, name, short_description, description, seo_title, seo_description
)
SELECT
  p.id,
  'en',
  'Khepree Batch Chat AI',
  'Windows desktop software that sends batch prompts to ChatGPT, Gemini, and other AI platforms.',
  E'## What it is

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
- One licensed device for the trial plan',
  'Khepree Batch Chat AI | Khepree',
  'Desktop batch chat AI software, licensed through Khepree.'
FROM products p
WHERE p.slug = 'khepree-batch-chat-ai'
ON CONFLICT (product_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  updated_at = now();

INSERT INTO features (key, value_type, description)
SELECT 'batch_chat_ai.access', 'boolean', 'Base access for Khepree Batch Chat AI'
WHERE NOT EXISTS (SELECT 1 FROM features WHERE key = 'batch_chat_ai.access');

INSERT INTO features (key, value_type, description)
SELECT 'account.required', 'boolean', 'Requires a Khepree account'
WHERE NOT EXISTS (SELECT 1 FROM features WHERE key = 'account.required');

INSERT INTO features (key, value_type, description)
SELECT 'devices.max', 'integer', 'Maximum licensed devices'
WHERE NOT EXISTS (SELECT 1 FROM features WHERE key = 'devices.max');

INSERT INTO plans (public_id, product_id, slug, billing_type, access_term_days, status, internal_code)
SELECT
  'plan_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  p.id,
  'trial',
  'free',
  1,
  'active',
  'BATCH_CHAT_AI_FREE_TRIAL'
FROM products p
WHERE p.slug = 'khepree-batch-chat-ai'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.slug = 'trial'
  );

INSERT INTO plan_translations (plan_id, locale, name)
SELECT pl.id, 'vi', 'Dùng thử'
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'trial'
ON CONFLICT (plan_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO plan_translations (plan_id, locale, name)
SELECT pl.id, 'en', 'Trial'
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'trial'
ON CONFLICT (plan_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO plan_features (plan_id, feature_id, boolean_value, integer_value, string_value)
SELECT pl.id, f.id, true, NULL, NULL
FROM plans pl
JOIN products p ON p.id = pl.product_id
JOIN features f ON f.key = 'batch_chat_ai.access'
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'trial'
  AND NOT EXISTS (
    SELECT 1 FROM plan_features pf WHERE pf.plan_id = pl.id AND pf.feature_id = f.id
  );

INSERT INTO plan_features (plan_id, feature_id, boolean_value, integer_value, string_value)
SELECT pl.id, f.id, true, NULL, NULL
FROM plans pl
JOIN products p ON p.id = pl.product_id
JOIN features f ON f.key = 'account.required'
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'trial'
  AND NOT EXISTS (
    SELECT 1 FROM plan_features pf WHERE pf.plan_id = pl.id AND pf.feature_id = f.id
  );

INSERT INTO plan_features (plan_id, feature_id, boolean_value, integer_value, string_value)
SELECT pl.id, f.id, NULL, 1, NULL
FROM plans pl
JOIN products p ON p.id = pl.product_id
JOIN features f ON f.key = 'devices.max'
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'trial'
  AND NOT EXISTS (
    SELECT 1 FROM plan_features pf WHERE pf.plan_id = pl.id AND pf.feature_id = f.id
  );

INSERT INTO plans (public_id, product_id, slug, billing_type, access_term_days, status, internal_code)
SELECT
  'plan_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  p.id,
  'month',
  'one_time',
  30,
  'active',
  'BATCH_CHAT_AI_MONTHLY'
FROM products p
WHERE p.slug = 'khepree-batch-chat-ai'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.slug = 'month'
  );

INSERT INTO plans (public_id, product_id, slug, billing_type, access_term_days, status, internal_code)
SELECT
  'plan_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  p.id,
  'year',
  'one_time',
  365,
  'active',
  'BATCH_CHAT_AI_YEARLY'
FROM products p
WHERE p.slug = 'khepree-batch-chat-ai'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.slug = 'year'
  );

UPDATE plans pl
SET
  billing_type = 'free',
  access_term_days = 1,
  status = 'active',
  internal_code = 'BATCH_CHAT_AI_FREE_TRIAL',
  updated_at = now()
FROM products p
WHERE p.id = pl.product_id AND p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'trial';

UPDATE plans pl
SET
  billing_type = 'one_time',
  access_term_days = 30,
  status = 'active',
  internal_code = 'BATCH_CHAT_AI_MONTHLY',
  updated_at = now()
FROM products p
WHERE p.id = pl.product_id AND p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'month';

UPDATE plans pl
SET
  billing_type = 'one_time',
  access_term_days = 365,
  status = 'active',
  internal_code = 'BATCH_CHAT_AI_YEARLY',
  updated_at = now()
FROM products p
WHERE p.id = pl.product_id AND p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'year';

INSERT INTO plan_translations (plan_id, locale, name)
SELECT pl.id, 'vi', 'Tháng'
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'month'
ON CONFLICT (plan_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO plan_translations (plan_id, locale, name)
SELECT pl.id, 'en', 'Monthly'
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'month'
ON CONFLICT (plan_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO plan_translations (plan_id, locale, name)
SELECT pl.id, 'vi', 'Năm'
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'year'
ON CONFLICT (plan_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO plan_translations (plan_id, locale, name)
SELECT pl.id, 'en', 'Yearly'
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'year'
ON CONFLICT (plan_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO plan_features (plan_id, feature_id, boolean_value, integer_value, string_value)
SELECT pl.id, f.id, true, NULL, NULL
FROM plans pl
JOIN products p ON p.id = pl.product_id
JOIN features f ON f.key = 'batch_chat_ai.access'
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug IN ('month', 'year')
  AND NOT EXISTS (
    SELECT 1 FROM plan_features pf WHERE pf.plan_id = pl.id AND pf.feature_id = f.id
  );

INSERT INTO plan_features (plan_id, feature_id, boolean_value, integer_value, string_value)
SELECT pl.id, f.id, true, NULL, NULL
FROM plans pl
JOIN products p ON p.id = pl.product_id
JOIN features f ON f.key = 'account.required'
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug IN ('month', 'year')
  AND NOT EXISTS (
    SELECT 1 FROM plan_features pf WHERE pf.plan_id = pl.id AND pf.feature_id = f.id
  );

INSERT INTO plan_features (plan_id, feature_id, boolean_value, integer_value, string_value)
SELECT pl.id, f.id, NULL, 1, NULL
FROM plans pl
JOIN products p ON p.id = pl.product_id
JOIN features f ON f.key = 'devices.max'
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug IN ('month', 'year')
  AND NOT EXISTS (
    SELECT 1 FROM plan_features pf WHERE pf.plan_id = pl.id AND pf.feature_id = f.id
  );

INSERT INTO prices (public_id, plan_id, currency, amount_minor, interval, region, is_active)
SELECT
  'price_batch_chat_ai_month_vnd',
  pl.id,
  'VND',
  99000,
  'month',
  'VN',
  true
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'month'
ON CONFLICT (public_id) DO UPDATE SET
  amount_minor = EXCLUDED.amount_minor,
  interval = EXCLUDED.interval,
  region = EXCLUDED.region,
  is_active = true,
  updated_at = now();

INSERT INTO prices (public_id, plan_id, currency, amount_minor, interval, region, is_active)
SELECT
  'price_batch_chat_ai_year_vnd',
  pl.id,
  'VND',
  900000,
  'year',
  'VN',
  true
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-batch-chat-ai' AND pl.slug = 'year'
ON CONFLICT (public_id) DO UPDATE SET
  amount_minor = EXCLUDED.amount_minor,
  interval = EXCLUDED.interval,
  region = EXCLUDED.region,
  is_active = true,
  updated_at = now();

UPDATE products p
SET
  metadata = p.metadata || jsonb_build_object('recommendedPlanPublicId', pl.public_id),
  updated_at = now()
FROM plans pl
WHERE p.slug = 'khepree-batch-chat-ai'
  AND pl.product_id = p.id
  AND pl.slug = 'year';

INSERT INTO desktop_clients (client_id, product_id, display_name, allowed_redirect_uris, status)
SELECT
  'khepree-batch-chat-ai-desktop',
  p.id,
  'Khepree Batch Chat AI',
  '["khepreebatchchatai://auth/callback"]'::jsonb,
  'active'
FROM products p
WHERE p.slug = 'khepree-batch-chat-ai'
  AND NOT EXISTS (SELECT 1 FROM desktop_clients WHERE client_id = 'khepree-batch-chat-ai-desktop');

SELECT dc.client_id, dc.display_name, dc.allowed_redirect_uris, dc.status, p.slug AS product_slug, p.status AS product_status
FROM desktop_clients dc
JOIN products p ON p.id = dc.product_id
WHERE dc.client_id = 'khepree-batch-chat-ai-desktop';
