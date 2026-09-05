-- Idempotent: register Khepree Livestream AI catalog product + desktop OAuth client.
-- Matches khepree-livestream-ai: slug, client_id, protocol/callback.
-- Safe to rerun — uses WHERE NOT EXISTS / ON CONFLICT patterns.

INSERT INTO products (public_id, slug, status, platform_capabilities, licensing_mode, metadata)
SELECT
  'prod_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  'khepree-livestream-ai',
  'active',
  '["desktop"]'::jsonb,
  'LICENSE_KEY_DEVICE',
  '{
    "app": "Khepree Livestream AI",
    "productCode": "KHEPREE_LIVESTREAM_AI",
    "accessFeatureKey": "livestream_ai.access",
    "desktopProtocol": "khepreelivestreamai",
    "productType": "desktop-software",
    "productCategory": "ai-tools",
    "operatingSystems": ["windows"]
  }'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'khepree-livestream-ai');

UPDATE products
SET
  status = 'active',
  platform_capabilities = '["desktop"]'::jsonb,
  licensing_mode = 'LICENSE_KEY_DEVICE',
  metadata = metadata || '{
    "app": "Khepree Livestream AI",
    "productCode": "KHEPREE_LIVESTREAM_AI",
    "accessFeatureKey": "livestream_ai.access",
    "desktopProtocol": "khepreelivestreamai",
    "productType": "desktop-software",
    "productCategory": "ai-tools",
    "operatingSystems": ["windows"]
  }'::jsonb,
  updated_at = now()
WHERE slug = 'khepree-livestream-ai';

INSERT INTO product_translations (
  product_id, locale, name, short_description, description, seo_title, seo_description
)
SELECT
  p.id,
  'vi',
  'Khepree Livestream AI',
  'Phần mềm desktop Windows giúp một người vận hành livestream bán hàng TikTok với AI dưới sự giám sát của con người.',
  E'## Giới thiệu\n\nKhepree Livestream AI là ứng dụng desktop Windows cho một người vận hành livestream thương mại trên TikTok. AI làm việc lặp lại; người vận hành có thể duyệt, sửa, hủy hoặc tiếp quản bất cứ lúc nào.\n\n## Tính năng\n\n- Ưu tiên bình luận có ý định mua và soạn phản hồi.\n- Theo dõi trạng thái bán hàng và đề xuất hành động tiếp theo.\n- Các thao tác livestream được bảo vệ chỉ mở khi có bản quyền Khepree hợp lệ.\n\n## Trạng thái trung thực\n\nTrang này gắn ứng dụng desktop với danh tính, quyền sử dụng và cấp phép thiết bị của Khepree. Đây là bản nền tảng, không phải tuyên bố sẵn sàng sản xuất.\n\n## Yêu cầu hệ thống\n\n- Windows\n- Tài khoản Khepree\n- Một thiết bị được cấp phép cho gói dùng thử',
  'Khepree Livestream AI | Khepree',
  'Phần mềm desktop Windows hỗ trợ livestream TikTok có giám sát, bản quyền qua Khepree.'
FROM products p
WHERE p.slug = 'khepree-livestream-ai'
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
  'Khepree Livestream AI',
  'Windows desktop software that helps one operator run a TikTok commerce livestream with human-supervised AI.',
  E'## What it is\n\nKhepree Livestream AI is a Windows desktop app for one human operator running a TikTok commerce livestream. AI handles repetitive work; the operator can approve, edit, cancel, or take over at any time.\n\n## What it does\n\n- Prioritize buyer-intent comments and draft replies.\n- Track sales state and propose the next action.\n- Keep protected livestream actions behind a Khepree license.\n\n## Honest status\n\nThis listing binds the desktop app to Khepree identity, entitlement, and device licensing. The client is a foundation build, not a production-ready claim.\n\n## Requirements\n\n- Windows\n- A Khepree account\n- One licensed device for the trial plan',
  'Khepree Livestream AI | Khepree',
  'Windows desktop software for human-supervised TikTok commerce livestreams, licensed through Khepree.'
FROM products p
WHERE p.slug = 'khepree-livestream-ai'
ON CONFLICT (product_id, locale) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  updated_at = now();

INSERT INTO features (key, value_type, description)
SELECT 'livestream_ai.access', 'boolean', 'Base access for Khepree Livestream AI'
WHERE NOT EXISTS (SELECT 1 FROM features WHERE key = 'livestream_ai.access');

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
  'LIVESTREAM_AI_FREE_TRIAL'
FROM products p
WHERE p.slug = 'khepree-livestream-ai'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.slug = 'trial'
  );

INSERT INTO plan_translations (plan_id, locale, name)
SELECT pl.id, 'vi', 'Dùng thử'
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug = 'trial'
ON CONFLICT (plan_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO plan_translations (plan_id, locale, name)
SELECT pl.id, 'en', 'Trial'
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug = 'trial'
ON CONFLICT (plan_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO plan_features (plan_id, feature_id, boolean_value, integer_value, string_value)
SELECT pl.id, f.id, true, NULL, NULL
FROM plans pl
JOIN products p ON p.id = pl.product_id
JOIN features f ON f.key = 'livestream_ai.access'
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug = 'trial'
  AND NOT EXISTS (
    SELECT 1 FROM plan_features pf WHERE pf.plan_id = pl.id AND pf.feature_id = f.id
  );

INSERT INTO plan_features (plan_id, feature_id, boolean_value, integer_value, string_value)
SELECT pl.id, f.id, true, NULL, NULL
FROM plans pl
JOIN products p ON p.id = pl.product_id
JOIN features f ON f.key = 'account.required'
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug = 'trial'
  AND NOT EXISTS (
    SELECT 1 FROM plan_features pf WHERE pf.plan_id = pl.id AND pf.feature_id = f.id
  );

INSERT INTO plan_features (plan_id, feature_id, boolean_value, integer_value, string_value)
SELECT pl.id, f.id, NULL, 1, NULL
FROM plans pl
JOIN products p ON p.id = pl.product_id
JOIN features f ON f.key = 'devices.max'
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug = 'trial'
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
  'LIVESTREAM_AI_MONTHLY'
FROM products p
WHERE p.slug = 'khepree-livestream-ai'
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
  'LIVESTREAM_AI_YEARLY'
FROM products p
WHERE p.slug = 'khepree-livestream-ai'
  AND NOT EXISTS (
    SELECT 1 FROM plans pl WHERE pl.product_id = p.id AND pl.slug = 'year'
  );

UPDATE plans pl
SET
  billing_type = 'free',
  access_term_days = 1,
  status = 'active',
  internal_code = 'LIVESTREAM_AI_FREE_TRIAL',
  updated_at = now()
FROM products p
WHERE p.id = pl.product_id AND p.slug = 'khepree-livestream-ai' AND pl.slug = 'trial';

UPDATE plans pl
SET
  billing_type = 'one_time',
  access_term_days = 30,
  status = 'active',
  internal_code = 'LIVESTREAM_AI_MONTHLY',
  updated_at = now()
FROM products p
WHERE p.id = pl.product_id AND p.slug = 'khepree-livestream-ai' AND pl.slug = 'month';

UPDATE plans pl
SET
  billing_type = 'one_time',
  access_term_days = 365,
  status = 'active',
  internal_code = 'LIVESTREAM_AI_YEARLY',
  updated_at = now()
FROM products p
WHERE p.id = pl.product_id AND p.slug = 'khepree-livestream-ai' AND pl.slug = 'year';

INSERT INTO plan_translations (plan_id, locale, name)
SELECT pl.id, 'vi', 'Tháng'
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug = 'month'
ON CONFLICT (plan_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO plan_translations (plan_id, locale, name)
SELECT pl.id, 'en', 'Monthly'
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug = 'month'
ON CONFLICT (plan_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO plan_translations (plan_id, locale, name)
SELECT pl.id, 'vi', 'Năm'
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug = 'year'
ON CONFLICT (plan_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO plan_translations (plan_id, locale, name)
SELECT pl.id, 'en', 'Yearly'
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug = 'year'
ON CONFLICT (plan_id, locale) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO plan_features (plan_id, feature_id, boolean_value, integer_value, string_value)
SELECT pl.id, f.id, true, NULL, NULL
FROM plans pl
JOIN products p ON p.id = pl.product_id
JOIN features f ON f.key = 'livestream_ai.access'
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug IN ('month', 'year')
  AND NOT EXISTS (
    SELECT 1 FROM plan_features pf WHERE pf.plan_id = pl.id AND pf.feature_id = f.id
  );

INSERT INTO plan_features (plan_id, feature_id, boolean_value, integer_value, string_value)
SELECT pl.id, f.id, true, NULL, NULL
FROM plans pl
JOIN products p ON p.id = pl.product_id
JOIN features f ON f.key = 'account.required'
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug IN ('month', 'year')
  AND NOT EXISTS (
    SELECT 1 FROM plan_features pf WHERE pf.plan_id = pl.id AND pf.feature_id = f.id
  );

INSERT INTO plan_features (plan_id, feature_id, boolean_value, integer_value, string_value)
SELECT pl.id, f.id, NULL, 1, NULL
FROM plans pl
JOIN products p ON p.id = pl.product_id
JOIN features f ON f.key = 'devices.max'
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug IN ('month', 'year')
  AND NOT EXISTS (
    SELECT 1 FROM plan_features pf WHERE pf.plan_id = pl.id AND pf.feature_id = f.id
  );

INSERT INTO prices (public_id, plan_id, currency, amount_minor, interval, region, is_active)
SELECT
  'price_livestream_ai_month_vnd',
  pl.id,
  'VND',
  299000,
  'month',
  'VN',
  true
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug = 'month'
ON CONFLICT (public_id) DO UPDATE SET
  amount_minor = EXCLUDED.amount_minor,
  interval = EXCLUDED.interval,
  region = EXCLUDED.region,
  is_active = true,
  updated_at = now();

INSERT INTO prices (public_id, plan_id, currency, amount_minor, interval, region, is_active)
SELECT
  'price_livestream_ai_year_vnd',
  pl.id,
  'VND',
  2799000,
  'year',
  'VN',
  true
FROM plans pl
JOIN products p ON p.id = pl.product_id
WHERE p.slug = 'khepree-livestream-ai' AND pl.slug = 'year'
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
WHERE p.slug = 'khepree-livestream-ai'
  AND pl.product_id = p.id
  AND pl.slug = 'year';

INSERT INTO desktop_clients (client_id, product_id, display_name, allowed_redirect_uris, status)
SELECT
  'khepree-livestream-ai-desktop',
  p.id,
  'Khepree Livestream AI',
  '["khepreelivestreamai://auth/callback"]'::jsonb,
  'active'
FROM products p
WHERE p.slug = 'khepree-livestream-ai'
  AND NOT EXISTS (SELECT 1 FROM desktop_clients WHERE client_id = 'khepree-livestream-ai-desktop');

SELECT dc.client_id, dc.display_name, dc.allowed_redirect_uris, dc.status, p.slug AS product_slug, p.status AS product_status
FROM desktop_clients dc
JOIN products p ON p.id = dc.product_id
WHERE dc.client_id = 'khepree-livestream-ai-desktop';
